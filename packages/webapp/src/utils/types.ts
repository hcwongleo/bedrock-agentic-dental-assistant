export enum QUERY_KEYS {
    CAROUSAL = "CAROUSAL",
    TODOS = "TODOS",
    CHATS = "CHATS",
    DOCUMENTS = "DOCUMENTS",
    ORDERS = 'ORDERS',
    BDA_RESULTS = 'BDA_RESULTS',
}

// AWS S3 folder prefixes mapped to React Query keys
// trailing / is required for folder prefixes
export const DatasetPrefix = {
    [QUERY_KEYS.CAROUSAL]: "carousal/",
    [QUERY_KEYS.DOCUMENTS]: "datasets/documents/",
    [QUERY_KEYS.ORDERS]: 'orders/',
    [QUERY_KEYS.BDA_RESULTS]: 'bda-result/',
}

export type ItemType = { itemName: string; path: string; url: string; lastModified?: Date; }

export type S3ItemsType = {
    eTag: string | undefined,
    lastModified: Date | undefined,
    size: number | undefined,
    path: string,

}

export type ChatInputType = {
    userID: string;
    message: string;
    documents?: DocumentType[]; 
}

export type AuthedUserType = {
    userID: string;
    userName: string;
}

export interface DocumentType {
    id: string;
    title: string;
    description?: string;
    imageUrl: string;
    fileType: 'pdf' | 'image' | 'unknown';
}

// New type for the image card component props
export interface ImageCardProps {
    items: DocumentType[];
    selectedItems: Set<string>;
    onSelectionChange: (selectedIds: Set<string>) => void;
}
