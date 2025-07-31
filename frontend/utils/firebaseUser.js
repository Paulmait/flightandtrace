import { db } from '../firebase';
import { collection, doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export async function addPerson(userId, person) {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const data = userSnap.data();
    const people = data.people || [];
    people.push(person);
    await updateDoc(userRef, { people });
  }
}

export async function editPerson(userId, personId, newName) {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const data = userSnap.data();
    const people = data.people.map(p => p.id === personId ? { ...p, name: newName } : p);
    await updateDoc(userRef, { people });
  }
}

export async function deletePerson(userId, personId) {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const data = userSnap.data();
    const people = data.people.filter(p => p.id !== personId);
    await updateDoc(userRef, { people });
  }
}

export async function linkFlightToPerson(userId, personId, flightNumber) {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const data = userSnap.data();
    const people = data.people.map(p =>
      p.id === personId ? { ...p, flights: [...(p.flights || []), flightNumber] } : p
    );
    await updateDoc(userRef, { people });
  }
}
