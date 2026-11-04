export type DatasetFormat='csv'|'tsv'|'json'|'jsonl'|'txt'|'other';
export type DatasetStatus='ready'|'needs-review'|'unprocessed';
export interface Row {[key:string]:string;}
export interface Preview {columns:string[];rows:Row[];estimatedTotal:number|null;sampled:boolean;message?:string;}
export interface DatasetRecord {
 id:string;name:string;source:string;format:DatasetFormat;size:number;rows:number|null;
 columns:string[];createdAt:number;storagePath:string;status:DatasetStatus;
 parentId?:string|null;notes?:string;
 sample?:Preview;profile?:{sampledRows:number;missingCells:number;duplicates:number;issues:string[]};
}
export interface SourceRecord {
 id:string;name:string;provider:'github'|'kaggle'|'huggingface'|'s3'|'sql'|'upload'|'other';
 locator:string;createdAt:number;status:'registered';
}
