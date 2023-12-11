import { Pinecone, PineconeClient,Vector,utils as PineconeUtils } from "@pinecone-database/pinecone"
import { downloadFromS3 } from "./s3-server";
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'
import {Document,RecursiveCharacterTextSplitter} from "@pinecone-database/doc-splitter"
import { getEmbedding } from "./embeddings";
import md5 from 'md5'
import { convertToAscii } from "./utils";
let pinecone: PineconeClient | null = null;
export const getPineconeClient = async () => {
    if (!pinecone) {
        pinecone = new PineconeClient();
        await pinecone.init({
            environment: process.env.PINECONE_ENVIRONMENT!,
            apiKey: process.env.PINECONE_API_KEY!,
        })
    }
    return pinecone
}

type PDFPage = {
    pageContent: string;
    metadata: {
        loc:{pageNumber:number}
    }
}

export async function loadS3IntoPinecone(fileKey:string){
    //obtain the pdf- download and read pdf
    console.log(`downloading s3 onto file system`)
    const file_name = await downloadFromS3(fileKey);
    if (!file_name) {
        throw new Error('Could not download from s3')
    }
    const loader = new PDFLoader(file_name);
    const pages = (await loader.load()) as PDFPage[];
    // 2. split and segment the pdf into pages
    //pages=Array(13)
    const documents = await Promise.all(pages.map(prepareDocument))
    //Array(100)
    //3. vectorize and embed individual documents
    const vectors = await Promise.all(documents.flat().map(embedDocument))

    //4. upload to pinecone
    const client = await getPineconeClient()
    const pineconeIndex = client.Index('chatpdf')

    console.log('Inserting vectors into pinecone')
    const namespace = convertToAscii(fileKey)
    
    PineconeUtils.chunkedUpsert(pineconeIndex, vectors, namespace, 10)
    
    return documents[0];
}

async function embedDocument(doc: Document) {
    try {
        const embeddings = await getEmbedding(doc.pageContent)
        const hash = md5(doc.pageContent)

        return {
            id: hash,
            values: embeddings,
            metadata: {
                text: doc.metadata.text,
                pageNumber: doc.metadata.pageNumber
            }
        } as Vector
    } catch (error) {
        console.log("error embedding document",error)
        throw error
    }
    
}
export const truncateStringByBytes = (str:string, bytes: number)=>{
    const enc = new TextEncoder();
    return new TextDecoder('utf-8').decode(enc.encode(str).slice(0,bytes))
}

async function prepareDocument(page: PDFPage) {
    let { pageContent, metadata } = page;
    pageContent = pageContent.replace(/\n/g, '')
    //split the docs
    const splitter = new RecursiveCharacterTextSplitter()
    const docs = await splitter.splitDocuments([
        new Document({
            pageContent,
            metadata: {
                pageNumber: metadata.loc.pageNumber,
                text:truncateStringByBytes(pageContent,36000),
            }
        })
    ])
    return docs
}