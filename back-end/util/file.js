const path = require('path');
const fs = require('fs');

const clearImage = filePath => {
	filePath = path.join(__dirname, '../', filePath);
	fs.unlink(filePath, e => console.log(e));
}

exports.clearImage = clearImage;