import { useQuery } from "@tanstack/react-query";
import { downloadData, getUrl, list } from 'aws-amplify/storage';
import { ItemType, QUERY_KEYS, S3ItemsType, DatasetPrefix } from "../utils/types";


export const fetchJsonFromPath = async (path: string) => {
    // fetch json from URL 
    try {
        console.log(`Attempting to download from path: ${path}`);
        const downloadResult = await downloadData({ path }).result;
        const text = await downloadResult.body.text();
        console.log(`Downloaded data from ${path}:`, text.substring(0, 200) + (text.length > 200 ? '...' : ''));
        
        try {
            const parsedData = JSON.parse(text);
            return parsedData;
        } catch (parseError) {
            console.error(`Error parsing JSON from ${path}:`, parseError);
            return null;
        }
    } catch (e) {
        console.error(`Error downloading from ${path}:`, e);
        return "[]";
    }
}

export const getItemUrl = async (path: string, itemName: string) => {
    console.log(`${path}${itemName}`);

    const results = await getUrl({
        path: `${path}${itemName}`, options: {
            validateObjectExistence: true,  // Check if object exists before creating a URL
            expiresIn: 3600 // validity of the URL, in seconds. defaults to 900 (15 minutes) and maxes at 3600 (1 hour)
        }
    })
    return ({
        itemName: itemName,
        path,
        url: results.url.href.toString()
    })
}

export const listItems = async (path: string) => {
    try {
        const result = await list({
            path,
        });

        // this will list all files in path remove the root directory itself and list only the files within it 
        // length 2 to avoid "/" for root folders
        const items = result.items.map(item => (item.path.split(path)[1])).filter(i => i.length > 2)
        console.log("🚀 ~ listItems ~ items:", items)

        // iterates over all item keys and awaits until all URLs for each individual item has been received
        const urlList = await Promise.all(items.map(async (i) => await getItemUrl(path, i))).then((values) => values) as ItemType[]

        console.log("🚀 ~ listItems ~ urlList:", urlList)

        return urlList
    } catch (error) {
        console.log(error);
        return []
    }
}


export const useS3ListItems = (type: keyof typeof DatasetPrefix) => {
    return useQuery({
        queryKey: [type],
        queryFn: () => listItems(DatasetPrefix[type]),
        enabled: DatasetPrefix[type].length > 0,
    })
}


const listDataBucket = async () => {
    try {
        const result = await list({
            path: "",
            // Alternatively, path: ({identityId}) => `protected/${identityId}/photos/`
        });
        if (result.items) {
            const items = result.items.map((item) => {
                return {
                    eTag: item.eTag,
                    lastModified: item.lastModified,
                    size: item.size,
                    path: item.path,
                }
            })
            console.log("🚀 ~ listBuckets ~ result:", items)
            return items as S3ItemsType[]
        }
    } catch (error) {
        console.log(error);
    }
    return []
}

export const useListDataBucket = () => {
    return useQuery({
        queryKey: ["data"],
        queryFn: () => listDataBucket(),
    })
}