// SIMULATOR SETUP
    console.clear();
    var _ = require('lodash');
    const Simulator = require ('./classes/Simulator');
    const simulator = new Simulator(_, {/*options*/}, async function (){
		
////////////////////////
// WRITE BELOW THIS LINE
////////////////////////

// test mergefields
console.log('//// TEST MERGEFIELDS ////')
this.log.info('old mergefield ref', this.get('foo'));
this.log.warn('new mergefield ref', await this.mergeFields['biz'].get({path: 'bat'}));
this.log.info('old mergefield default', this.get('no-such-mf', 'yay'));
this.log.warn('new mergefield default', await this.mergeFields['no-such'].get({defaultValue:'hooray'}));
console.log('\n//// BEGIN STEP LOGIC ////\n')

// REPLICATING PHONE NUMBER VALIDATION STEP FOR DEMONSTRATION

// Values from step UI

let input_phone = this.get('phoneValid');
// let input_phone = this.get('phoneInvalid');
let doLog = true;
let outputFormat = 'e164'

// Step logic

const PhoneNumber = require( 'awesome-phonenumber' );
const isoCountry = 'US';

let interpreted = new PhoneNumber(input_phone, isoCountry);

if (!interpreted.isValid() && !input_phone.startsWith('+')) {
  this.log.warn(`Input phone number is not ${isoCountry}/cell and is not in E.164, may be invalid input. Attempting to interpret anyway.`);
  interpreted = new PhoneNumber(`+${input_phone}`);
} else if (!interpreted.isValid()) {
  interpreted = new PhoneNumber(input_phone);
}

if (!interpreted.isValid()) {
  this.log.warn('Error attempting to interpret phone number.', input_phone);
  return this.exitStep('invalid', {
    inputPhone: input_phone,
    valid: false,
    possible: false
  });
}

interpreted = interpreted.toJSON();

if (doLog) {
  this.log.info('Interpreted phone number ' + input_phone, interpreted);
}

const numberDetails = {
  "inputPhone": input_phone,
  "phone": interpreted.number[outputFormat],
  "canBeInternationallyDialled": interpreted.canBeInternationallyDialled,
  "regionCode": interpreted.regionCode,
  "valid": interpreted.valid,
  "possible": interpreted.possible,
  "type": interpreted.type,
  "possibility": interpreted.possibility
}

return this.exitStep('next', numberDetails);


////////////////////////
// WRITE ABOVE THIS LINE
////////////////////////

});
simulator.run();