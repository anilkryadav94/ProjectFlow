
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, query, orderBy, where, writeBatch } from "firebase/firestore";
import { getAllProjects } from "./project-service";

export interface Country {
    id: string;
    name: string;
}

export async function getAllCountries(): Promise<Country[]> {
    const countriesCollection = collection(db, "countries");
    const q = query(countriesCollection, orderBy("name", "asc"));
    const countrySnapshot = await getDocs(q);
    
    if (countrySnapshot.empty) {
        console.log("Countries collection is empty. Seeding from existing projects...");
        const projects = await getAllProjects();
        const distinctCountryNames = [...new Set(projects.map(p => p.country).filter(Boolean))];

        if (distinctCountryNames.length > 0) {
            const batch = writeBatch(db);
            distinctCountryNames.forEach(name => {
                if(name) {
                    const newCountryRef = doc(countriesCollection);
                    batch.set(newCountryRef, { name });
                }
            });
            await batch.commit();
            console.log(`Seeded ${distinctCountryNames.length} countries.`);
            
            const seededSnapshot = await getDocs(q);
            return seededSnapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name,
            }));
        }
        return [];
    }
    
    return countrySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
    }));
}

export async function ensureCountryExists(countryName: string): Promise<void> {
    if (!countryName || typeof countryName !== 'string' || countryName.trim() === '') {
        return;
    }

    const countriesCollection = collection(db, "countries");
    const q = query(countriesCollection, where("name", "==", countryName.trim()));
    const countrySnapshot = await getDocs(q);

    if (countrySnapshot.empty) {
        console.log(`Country "${countryName}" not found. Adding to countries collection.`);
        const newCountryRef = doc(countriesCollection);
        await setDoc(newCountryRef, { name: countryName.trim() });
    }
}
