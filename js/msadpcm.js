// MS-ADPCM decoder
// Modified from https://github.com/Snack-X/node-ms-adpcm/tree/master to work in the browser

const ADAPTATION_TABLE = [
	230, 230, 230, 230, 307, 409, 512, 614,
	768, 614, 512, 409, 307, 230, 230, 230,
];


function clamp(val, min, max) {
	if(val < min) return min;
	else if(val > max) return max;
	else return val;
}

function expandNibble(nibble, state, channel) {
	const signed = 8 <= nibble ? nibble - 16 : nibble;

	let predictor = ((
		state.sample1[channel] * state.coeff1[channel] +
		state.sample2[channel] * state.coeff2[channel]
	) >> 8) + (signed * state.delta[channel]);
  
	predictor = clamp(predictor, -0x8000, 0x7fff);

	state.sample2[channel] = state.sample1[channel];
	state.sample1[channel] = predictor;
  
	state.delta[channel] = Math.floor(ADAPTATION_TABLE[nibble] * state.delta[channel] / 256);
	if(state.delta[channel] < 16) state.delta[channel] = 16;
  
	return predictor;
}

/**
 * Decode a block of MS-ADPCM data
 * @param  {Uint8Array|Buffer}  buf           one block of MS-ADPCM data
 * @param  {number}             channels      number of channels (usually 1 or 2, never tested on upper values)
 * @param  {number[]}           coefficient1  array of 7 UInt8 coefficient values
 *                                            usually, [ 256, 512, 0, 192, 240, 460, 392 ]
 * @param  {number[]}           coefficient2  array of 7 UInt8 coefficient values
 *                                            usually, [ 0, -256, 0, 64, 0, -208, -232 ]
 * @return {Array<number[]>}                  array of decoded PCM buffer for each channels
 */
function decode(buf, channels, coefficient1, coefficient2) {
	const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	
	const state = {
		coefficient: [ coefficient1, coefficient2 ],
		coeff1: [],
		coeff2: [],
		delta: [],
		sample1: [],
		sample2: [],
	};
  
	let offset = 0;

	// Read MS-ADPCM header
	for(let i = 0 ; i < channels ; i++) {
	  const predictor = clamp(bytes[offset], 0, 6);
	  offset += 1;
  
	  state.coeff1[i] = state.coefficient[0][predictor];
	  state.coeff2[i] = state.coefficient[1][predictor];
	}

	for(let i = 0 ; i < channels ; i++) { 
	  state.delta.push(view.getInt16(offset, true)); 
	  offset += 2; 
	}
	for(let i = 0 ; i < channels ; i++) { 
	  state.sample1.push(view.getInt16(offset, true)); 
	  offset += 2; 
	}
	for(let i = 0 ; i < channels ; i++) { 
	  state.sample2.push(view.getInt16(offset, true)); 
	  offset += 2; 
	}
  
	// Decode
	const output = [];
  
	for(let i = 0 ; i < channels ; i++)
	  output[i] = [ state.sample2[i], state.sample1[i] ];
  
	let channel = 0;
	while(offset < bytes.length) {
		const byte = bytes[offset];
		offset += 1;

		output[channel].push(expandNibble(byte >> 4, state, channel));
		channel = (channel + 1) % channels;

		output[channel].push(expandNibble(byte & 0xf, state, channel));
		channel = (channel + 1) % channels;
	}
  
	return output;
}

/**
 * Interleave multiple channels into a single PCM buffer
 * @param  {Array<number[]>}  channels  array of PCM data for each channel
 * @return {Int16Array}                 interleaved PCM data
 */
function interleaveChannels(channels) {
	const numChannels = channels.length;
	const samplesPerChannel = channels[0].length;
	const interleavedData = new Int16Array(numChannels * samplesPerChannel);
	
	for (let i = 0; i < samplesPerChannel; i++) {
		for (let ch = 0; ch < numChannels; ch++) {
			interleavedData[i * numChannels + ch] = channels[ch][i];
		}
	}
	
	return interleavedData;
}

/**
 * Create a WAV blob from PCM data
 * @param  {Int16Array}  pcmData     interleaved PCM data
 * @param  {number}      channels    number of channels
 * @param  {number}      sampleRate  sample rate in Hz
 * @return {Blob}                    WAV file blob
 */
function createWavBlob(pcmData, channels, sampleRate) {
	const bitsPerSample = 16;
	const byteRate = sampleRate * channels * bitsPerSample / 8;
	const blockAlign = channels * bitsPerSample / 8;
	const dataSize = pcmData.length * 2;
	
	const buffer = new ArrayBuffer(44 + dataSize);
	const view = new DataView(buffer);
	
	const writeString = (offset, string) => {
		for (let i = 0; i < string.length; i++) {
			view.setUint8(offset + i, string.charCodeAt(i));
		}
	};
	
	// RIFF chunk descriptor
	writeString(0, 'RIFF');
	view.setUint32(4, 36 + dataSize, true);
	writeString(8, 'WAVE');
	
	// fmt sub-chunk
	writeString(12, 'fmt ');
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);  // PCM format
	view.setUint16(22, channels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, byteRate, true);
	view.setUint16(32, blockAlign, true);
	view.setUint16(34, bitsPerSample, true);
	
	writeString(36, 'data');
	view.setUint32(40, dataSize, true);
	
	for (let i = 0; i < pcmData.length; i++) {
		view.setInt16(44 + i * 2, pcmData[i], true);
	}
	
	return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Decode MS-ADPCM WAV file and return a playable PCM WAV blob
 * @param  {ArrayBuffer}  arrayBuffer  WAV file data
 * @return {Blob}                      decoded PCM WAV blob
 */
function decodeWavFile(arrayBuffer) {
	const dataView = new DataView(arrayBuffer);
	
	// Parse RIFF header
	let offset = 0;
	const riff = String.fromCharCode(dataView.getUint8(offset), dataView.getUint8(offset + 1), 
									  dataView.getUint8(offset + 2), dataView.getUint8(offset + 3));
	if (riff !== 'RIFF') {
		throw new Error('Not a valid WAV file');
	}
	offset += 4;
	
	const fileSize = dataView.getUint32(offset, true);
	offset += 4;
	
	const wave = String.fromCharCode(dataView.getUint8(offset), dataView.getUint8(offset + 1), 
									  dataView.getUint8(offset + 2), dataView.getUint8(offset + 3));
	if (wave !== 'WAVE') {
		throw new Error('Not a valid WAV file');
	}
	offset += 4;
	
	// Parse chunks
	let channels, sampleRate, blockAlign, bitsPerSample;
	let coefficient1 = [256, 512, 0, 192, 240, 460, 392];
	let coefficient2 = [0, -256, 0, 64, 0, -208, -232];
	let dataChunkOffset = 0;
	let dataChunkSize = 0;
	
	while (offset < arrayBuffer.byteLength) {
		const chunkId = String.fromCharCode(dataView.getUint8(offset), dataView.getUint8(offset + 1), 
											dataView.getUint8(offset + 2), dataView.getUint8(offset + 3));
		offset += 4;
		const chunkSize = dataView.getUint32(offset, true);
		offset += 4;
		
		if (chunkId === 'fmt ') {
			const audioFormat = dataView.getUint16(offset, true);
			channels = dataView.getUint16(offset + 2, true);
			sampleRate = dataView.getUint32(offset + 4, true);
			blockAlign = dataView.getUint16(offset + 12, true);
			bitsPerSample = dataView.getUint16(offset + 14, true);
			
			if (audioFormat === 2) {
				const extraSize = dataView.getUint16(offset + 16, true);
				if (extraSize >= 32) {
					const numCoeff = dataView.getUint16(offset + 18 + 2, true);
					if (numCoeff === 7) {
						coefficient1 = [];
						coefficient2 = [];
						for (let i = 0; i < 7; i++) {
							coefficient1.push(dataView.getInt16(offset + 18 + 4 + i * 4, true));
							coefficient2.push(dataView.getInt16(offset + 18 + 4 + i * 4 + 2, true));
						}
					}
				}
			}
			
			offset += chunkSize;
		} else if (chunkId === 'data') {
			dataChunkOffset = offset;
			dataChunkSize = chunkSize;
			offset += chunkSize;
		} else {
			offset += chunkSize;
		}
	}
	
	if (!dataChunkOffset || !channels || !sampleRate) {
		throw new Error('Invalid WAV file structure');
	}
	
	const decodedChannels = [];
	let currentOffset = dataChunkOffset;
	const endOffset = dataChunkOffset + dataChunkSize;
	
	while (currentOffset < endOffset) {
		const blockSize = Math.min(blockAlign, endOffset - currentOffset);
		const blockData = new Uint8Array(arrayBuffer, currentOffset, blockSize);
		
		const decodedBlock = decode(blockData, channels, coefficient1, coefficient2);
		
		if (decodedChannels.length === 0) {
			for (let i = 0; i < channels; i++) {
				decodedChannels.push([]);
			}
		}

		for (let i = 0; i < channels; i++) {
			decodedChannels[i].push(...decodedBlock[i]);
		}
		
		currentOffset += blockSize;
	}
	
	const pcmData = interleaveChannels(decodedChannels);
	return createWavBlob(pcmData, channels, sampleRate);
}

export default decode;

if (typeof window !== 'undefined') {
	window.msadpcmDecode = decode;
	window.msadpcmDecodeWavFile = decodeWavFile;
}