import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, Firestore, writeBatch } from 'firebase/firestore';
import { Student } from '../types';

// Konfigurasi Firebase Anda
const firebaseConfig = {
  apiKey: "AIzaSyDPCyo0XTJG1yJKCb9MLz4oC3gi4O_Hy4o",
  authDomain: "data-analisis-ce74c.firebaseapp.com",
  projectId: "data-analisis-ce74c",
  storageBucket: "data-analisis-ce74c.firebasestorage.app",
  messagingSenderId: "28397624054",
  appId: "1:28397624054:web:398fd06a2e00afe2e66ad7",
  measurementId: "G-RPQC93TGZE"
};

let db: Firestore | null = null;
let isFirebaseAvailable = false;

// Cuba inisialisasi Firebase
try {
  if (!getApps().length) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    isFirebaseAvailable = true;
  } else {
    // Gunakan aplikasi sedia ada jika sudah diinisialisasi (cth: hot reload)
    const app = getApps()[0];
    db = getFirestore(app);
    isFirebaseAvailable = true;
  }
} catch (e) {
  console.warn("Ralat sambungan Firebase, menggunakan LocalStorage:", e);
  isFirebaseAvailable = false;
}

const COLLECTION_NAME = 'students';

// Menyimpan atau mengemaskini senarai pelajar
// Menerima keseluruhan senarai untuk memastikan sinkronisasi yang tepat
export const saveStudents = async (students: Student[]): Promise<void> => {
  if (isFirebaseAvailable && db) {
    try {
        // Menggunakan batch untuk prestasi yang lebih baik dan mengurangkan request
        // Nota: Firestore batch terhad kepada 500 operasi.
        // Kita memproses dalam kumpulan (chunks) 400 untuk selamat.
        const chunkSize = 400;
        for (let i = 0; i < students.length; i += chunkSize) {
            const chunk = students.slice(i, i + chunkSize);
            const batch = writeBatch(db);
            
            chunk.forEach(student => {
                // Gunakan ID pelajar sebagai ID dokumen (set = upsert)
                // Ini akan mengemaskini jika wujud, atau mencipta jika tiada
                const docRef = doc(db!, COLLECTION_NAME, student.id);
                // Sanitize: Tukar undefined kepada null kerana Firestore tak terima undefined
                const cleanData = JSON.parse(JSON.stringify(student)); 
                batch.set(docRef, cleanData);
            });
            
            await batch.commit();
        }
    } catch (error: any) {
        console.error("Ralat Firebase:", error);
        if (error.code === 'permission-denied') {
            alert("Ralat Izin (Permission Denied): Sila pastikan Firestore Rules anda disetkan kepada 'allow read, write: if true;' di Firebase Console.");
        } else {
             // Fallback senyap ke localStorage jika Firebase gagal di tengah jalan
             console.warn("Menyimpan ke LocalStorage sebagai fallback.");
             localStorage.setItem(COLLECTION_NAME, JSON.stringify(students));
        }
    }
  } else {
    // Fallback LocalStorage: Simpan keseluruhan senarai
    localStorage.setItem(COLLECTION_NAME, JSON.stringify(students));
  }
};

export const fetchStudents = async (): Promise<Student[]> => {
  if (isFirebaseAvailable && db) {
    try {
        const snapshot = await getDocs(collection(db, COLLECTION_NAME));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
    } catch (error: any) {
        console.error("Gagal mengambil data dari Firebase:", error);
        if (error.code === 'permission-denied') {
             console.warn("Sila semak 'Rules' di Firestore Database Console.");
        }
        // Cuba ambil dari LocalStorage jika Firebase gagal
        const data = localStorage.getItem(COLLECTION_NAME);
        return data ? JSON.parse(data) : [];
    }
  } else {
    const data = localStorage.getItem(COLLECTION_NAME);
    return data ? JSON.parse(data) : [];
  }
};

export const updateStudent = async (student: Student): Promise<void> => {
  if (isFirebaseAvailable && db) {
    try {
        const studentRef = doc(db, COLLECTION_NAME, student.id);
        
        // Sanitize: Firestore cannot accept undefined values
        const cleanData = Object.fromEntries(
            Object.entries(student).map(([k, v]) => [k, v === undefined ? null : v])
        );

        await updateDoc(studentRef, cleanData);
    } catch (error) {
        console.error("Ralat mengemaskini data:", error);
        // Fallback local
        updateLocal(student);
    }
  } else {
    updateLocal(student);
  }
};

export const deleteStudent = async (studentId: string): Promise<void> => {
  if (isFirebaseAvailable && db) {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, studentId));
    } catch (error) {
      console.error("Ralat memadam data pelajar:", error);
      deleteLocal(studentId);
    }
  } else {
    deleteLocal(studentId);
  }
};

// New Function for Bulk Delete
export const deleteStudentsBulk = async (studentIds: string[]): Promise<void> => {
  if (isFirebaseAvailable && db) {
    try {
        const chunkSize = 400;
        for (let i = 0; i < studentIds.length; i += chunkSize) {
            const chunk = studentIds.slice(i, i + chunkSize);
            const batch = writeBatch(db);
            
            chunk.forEach(id => {
                const docRef = doc(db!, COLLECTION_NAME, id);
                batch.delete(docRef);
            });
            
            await batch.commit();
        }
    } catch (error) {
        console.error("Ralat memadam pukal:", error);
        // Fallback local
        studentIds.forEach(id => deleteLocal(id));
    }
  } else {
    studentIds.forEach(id => deleteLocal(id));
  }
};

// Helper untuk fallback update
const updateLocal = (student: Student) => {
    const current = JSON.parse(localStorage.getItem(COLLECTION_NAME) || '[]');
    const index = current.findIndex((s: Student) => s.id === student.id);
    if (index !== -1) {
      current[index] = student;
      localStorage.setItem(COLLECTION_NAME, JSON.stringify(current));
    }
}

// Helper untuk fallback delete
const deleteLocal = (studentId: string) => {
    const current = JSON.parse(localStorage.getItem(COLLECTION_NAME) || '[]');
    const newList = current.filter((s: Student) => s.id !== studentId);
    localStorage.setItem(COLLECTION_NAME, JSON.stringify(newList));
}

export const clearData = async (): Promise<void> => {
    if(isFirebaseAvailable && db) {
        try {
            const snapshot = await getDocs(collection(db, COLLECTION_NAME));
            const batchSize = 400;
            let batch = writeBatch(db);
            let counter = 0;

            // Loop sequentially to avoid overwhelming the network
            for(const document of snapshot.docs) {
                batch.delete(document.ref);
                counter++;
                
                if (counter >= batchSize) {
                    await batch.commit(); // Wait for this batch to finish before starting next
                    batch = writeBatch(db);
                    counter = 0;
                }
            }
            
            if (counter > 0) {
                await batch.commit();
            }
            
            // Success! Now clear local storage too to be safe
            localStorage.removeItem(COLLECTION_NAME);
            
        } catch (error: any) {
            console.error("Gagal memadam data Firestore:", error);
            if (error.code === 'permission-denied') {
                alert("Gagal memadam: Tiada kebenaran (Check Firestore Rules).");
            }
            // Even if Firestore fails, try to clear local to reflect UI changes if user desires
            localStorage.removeItem(COLLECTION_NAME);
            throw error; // Re-throw so UI knows it failed
        }
    } else {
        localStorage.removeItem(COLLECTION_NAME);
    }
}

export const getStorageMode = () => isFirebaseAvailable ? 'Firebase (Online)' : 'Local Storage (Offline)';