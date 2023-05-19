const fs = require('fs-extra');
const { createHash } = require('crypto');
const sizeOf = require('image-size');



async function ifSameImage(image1, image2) {
	if (await compareImageSize(image1, image2)) {
		if (await compareImageWH(image1, image2)) {
			if (await compareImageHash(image1, image2)) {
				return true;
			}
		}
	}

	return false
}

async function compareImageSize(image1, image2) {
	const imgInfo1 = await fs.promises.stat(image1);
	const imgInfo2 = await fs.promises.stat(image2);
	return imgInfo1.size === imgInfo2.size;
}

async function compareImageWH(image1, image2) {
	const [imgInfo1, imgInfo2] = await Promise.all([
		getImageWH(image1),
		getImageWH(image2)
	]);

	if (imgInfo1.height === imgInfo2.height && imgInfo1.width === imgInfo2.width) {
		return true;
	};

	return false
}

async function compareImageHash(imagePath1, imagePath2) {
	const hash1 = await generateSHA256(imagePath1);
	const hash2 = await generateSHA256(imagePath2);

	console.log(hash1, hash2)
	return hash1 === hash2
}

function getImageWH(image) {
	return new Promise(resolve => {
		sizeOf(image, function (err, dimensions) {
			if (err) throw err;
			resolve(dimensions)
		})
	})
}

async function generateSHA256(filepath) {
	const hashStream = createHash('sha256');
	const readStream = fs.createReadStream(filepath);

	return new Promise((resolve, reject) => {
		readStream.pipe(hashStream);

		hashStream
			.on('finish', () => {
				const hash = hashStream.digest('hex');

				resolve(hash);
			})
			.on('error', reject);
	});
}

module.exports = {
	ifSameImage
}