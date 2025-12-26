
const DB_NAME = 'PaddleOCR-ModelCache';
const STORE_NAME = 'models';
const DB_VERSION = 1;

let db: IDBDatabase;

// Initializes the IndexedDB database and creates the object store if it doesn't exist.
const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            reject('Error opening IndexedDB.');
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = () => {
            const dbInstance = request.result;
            if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
                dbInstance.createObjectStore(STORE_NAME);
            }
        };
    });
};

// Retrieves a value from the IndexedDB store by its key.
export const getFromDB = <T>(key: string): Promise<T | undefined> => {
    return new Promise(async (resolve, reject) => {
        try {
            const dbInstance = await initDB();
            const transaction = dbInstance.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);

            request.onsuccess = () => {
                resolve(request.result as T);
            };

            request.onerror = () => {
                reject('Error getting data from IndexedDB.');
            };
        } catch (error) {
            reject(error);
        }
    });
};

// Sets a value in the IndexedDB store with a given key.
export const setInDB = (key: string, value: any): Promise<void> => {
    return new Promise(async (resolve, reject) => {
       try {
            const dbInstance = await initDB();
            const transaction = dbInstance.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(value, key);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject('Error setting data in IndexedDB.');
            };
        } catch (error) {
            reject(error);
        }
    });
};
