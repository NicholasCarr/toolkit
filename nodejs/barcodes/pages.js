import bwipjs from 'bwip-js';           // If using the main package import
import fs from 'fs';

// import { auspost } from 'bwip-js';

bwipjs.toBuffer({
    bcid:        'code39',       // Barcode type
    text:        'S1099992Q01',    // Text to encode
    scale:       3,               // 3x scaling factor
    height:      6,              // Bar height, in millimeters
    includetext: true,            // Show human-readable text
    textxalign:  'center',        // Always good to set this
})
.then(png => {
    // write to file
    fs.writeFileSync('barcode.png', png);
    console.log('Barcode generated and saved to barcode.png');
    // `png` is a Buffer as in the example above
})
.catch(err => {
    console.error(err);
    // `err` may be a string or Error object
});