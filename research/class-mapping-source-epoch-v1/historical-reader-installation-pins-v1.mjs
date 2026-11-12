// Root-installed fixed historical bootstrap; no runtime caller overrides.
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
export const historicalReaderInstallationPins=freeze({materialized:false,bridgePath:'research/class-mapping-source-epoch-v1/class-mapping-historical-bridge-v1.json',bridgeSha256:null,bridgeCommit:null,bridgeTree:null,codeCommit:null,codeTree:null,codePins:{}});
