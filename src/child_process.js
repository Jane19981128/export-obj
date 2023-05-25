const cp = require('child_process');
const path = require('path');
const fs = require('fs-extra');
var readline = require('readline');

const { ifSameImage } = require('./del_repeat_img')
const { assimpexePath, SUCCESS_STR } = require('./constant');


const { outputPath } = require('./constant');
const input = outputPath + path.basename(process.argv.at(-2))
const output = process.argv.at(-1);
const outputDir = path.dirname(output);

//重复图片对应关系
const imgFlagMap = new Map();

async function exportModle() {
	await fs.remove(outputDir);
	await fs.ensureDir(outputDir);

	const [res1, res2] = await Promise.all([exportOBJModle(), extractImage()]);
	if (res1 == SUCCESS_STR && res2 == SUCCESS_STR) {
		// await SimplifyModle(output)
		await removeRepeatImage();
		await convertMTL()
	}
}

async function exportOBJModle() {

	return new Promise((resolve, reject) => {
		const cmd = `export ${input} ${output}`;

		const client = cp.spawn(assimpexePath, cmd.split(' '));

		client.stdout.on('data', (data) => {
			console.log(data.toString());
		});

		client.stderr.on('data', (err) => {
			console.log('extract model error' + err.toString());
			reject(err.toString())
		});

		client.on('close', (res) => {
			console.log('extract model end');
			resolve(SUCCESS_STR);
		})
	})
}

function extractImage() {

	return new Promise((resolve, reject) => {
		const cmd = `extract ${input} ${output}`;

		const clientImage = cp.spawn(assimpexePath, cmd.split(' '));

		clientImage.stdout.on('data', (data) => {
			console.log(data.toString())
		});

		clientImage.stderr.on('data', (err) => {
			console.log('extract image error' + err.toString());
			reject(err.toString())
		});
		clientImage.on('close', async (res) => {
			console.log('extract image end');
			resolve(SUCCESS_STR);
		})
	})
};

function removeRepeatImage() {
	let dirList = [];
	return new Promise((resolve, reject) => {
		fs.readdir(outputDir, async (error, data) => {
			if (error) {
				reject('readdir error' + error);
			}
			data.forEach(item => {
				if (item.includes('.jpg')|| item.includes('.png')) {
					const imagePath = path.join(outputDir, item);
					dirList.push(imagePath);
				}
			});
			let dirListTemp = dirList.concat();
			for (let j = 0; j < dirList.length; j++) {
				const imgNum = getImgNum(dirList[j]);
				imgFlagMap.set(imgNum, path.basename(dirList[j]));

				const tempList = [];

				for (let i = 1; i < dirListTemp.length; i++) {
					if (await ifSameImage(dirList[j], dirListTemp[i])) {
						console.log('查到重复图片', dirListTemp[i])
						//分离出重复图片的数字
						const sameImgNum = getImgNum(dirListTemp[i]);
						imgFlagMap.set(sameImgNum, path.basename(dirList[j]));

						//删除重复图片
						await fs.unlink(dirListTemp[i]);
					} else {
						tempList.push(dirListTemp[i]);
					}
				}

				dirListTemp = tempList.concat();
				dirList = dirList.slice(0, j + 1).concat(tempList);
			};

			
			resolve('remove finished');
		})
	})

}
//分离图片中标志数字
function getImgNum(str) {
	const flag = '_img';
	const numStart = str.indexOf(flag) + flag.length;
	const numEnd = str.indexOf(path.extname(str));
	const imgNum = str.slice(numStart, numEnd);
	return imgNum;
}
//读取mtl文件进行改写
async function convertMTL() {
	const basename = path.basename(output, '.obj');
	const mtlPath = outputDir + '/' + basename + '.mtl';
	const newMtlPath = outputDir + '/' + basename + '_new.mtl';

	await fs.remove(newMtlPath);
	await fs.ensureFile(newMtlPath);

	const fRead = await fs.createReadStream(mtlPath);
	const fWrite = await fs.createWriteStream(newMtlPath);

	return new Promise((resolve, reject) => {
		try {
			var readlineMTL = readline.createInterface({
				input: fRead,
				// 这是另一种复制方式，这样on('line')里就不必再调用fWrite.write(line)，当只是纯粹复制文件时推荐使用
				// output: fWrite,
				// terminal: false
			});
		} catch (err) {
			reject(err);
		}

		readlineMTL.on('line', (line) => {
			if (line.includes('map_Kd')) {
				line = line.trim();
				const start = line.indexOf('*');
				const count = line.substring(start + 1);

				imgFlagMap.forEach((val, key) => {
					if (key === count) {
						line = line.substring(0, start) + val;
					}
				})
			};
			fWrite.write(line + `\n`);
		});

		readlineMTL.on('close', async () => {
			await fs.remove(mtlPath);
			await fs.rename(newMtlPath, mtlPath);
			console.log('readline close...');
			resolve(SUCCESS_STR)
		})
	})
}

//减面操作
async function SimplifyModle(path){
	const mesh = await load(path, { output: 'geometry'});
	const targetFaceNum = 5000
	const meshSimplified = mesh.simplify(targetFaceNum);
	await save(path, meshSimplified, {format: 'stl'})
}
module.exports = {
	exportModle
}