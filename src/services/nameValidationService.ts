/**
 * Name Validation Service for CandyWarz
 * 
 * This service handles unique player name validation using Firebase.
 * It ensures no two players can use the same name in the game.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { initializeFirebase } from './firebase';

let db: any;

// Initialize Firebase once
const initializeDB = () => {
  if (!db) {
    console.log('🏷️ NameValidationService: Initializing Firebase...');
    const { db: firestore } = initializeFirebase();
    db = firestore;
    console.log('🏷️ NameValidationService: Firebase initialized, db:', !!db);
  }
  return db;
};

export interface PlayerNameRecord {
  id?: string;
  playerName: string;
  playerId: string;
  claimedAt: any; // Firebase Timestamp
}

class NameValidationService {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      console.log('🏷️ NameValidationService: Starting initialization...');
      initializeDB();
      this.isInitialized = true;
      console.log('✅ NameValidationService: Initialization complete');
    } catch (error) {
      console.error('❌ NameValidationService: Failed to initialize:', error);
      console.error('❌ NameValidationService: Initialization error details:', error.message);
      throw error;
    }
  }

  /**
   * Check if a player name is available (not taken by another player)
   */
  async isNameAvailable(playerName: string, excludePlayerId?: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const trimmedName = playerName.trim().toLowerCase();
      
      // Query for existing names (case-insensitive)
      let q = query(
        collection(db, 'player_names'),
        where('playerName', '==', trimmedName)
      );

      const querySnapshot = await getDocs(q);
      
      // If no documents found, name is available
      if (querySnapshot.empty) {
        return true;
      }

      // If excludePlayerId is provided, check if the name belongs to that player
      if (excludePlayerId) {
        const docs = querySnapshot.docs;
        const ownedByCurrentPlayer = docs.some(doc => 
          doc.data().playerId === excludePlayerId
        );
        
        // Name is available if it's owned by the current player
        return ownedByCurrentPlayer;
      }

      // Name is taken by someone else
      return false;
    } catch (error) {
      console.error('❌ Failed to check name availability:', error);
      // On error, assume name is taken to be safe
      return false;
    }
  }

  /**
   * Reserve a player name for a specific player
   */
  async reserveName(playerName: string, playerId: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const trimmedName = playerName.trim().toLowerCase();
      
      // First check if name is available
      const isAvailable = await this.isNameAvailable(trimmedName, playerId);
      if (!isAvailable) {
        console.log('🏷️ Name not available:', trimmedName);
        return false;
      }

      // Remove any existing name for this player first
      await this.releaseName(playerId);

      // Reserve the new name
      const nameRecord: Omit<PlayerNameRecord, 'id'> = {
        playerName: trimmedName,
        playerId,
        claimedAt: new Date(), // Using JS Date, Firebase will convert to Timestamp
      };

      const docRef = await addDoc(collection(db, 'player_names'), nameRecord);
      console.log('✅ Name reserved successfully:', trimmedName, 'for player:', playerId, 'Doc ID:', docRef.id);
      return true;
    } catch (error) {
      console.error('❌ Failed to reserve name:', error);
      return false;
    }
  }

  /**
   * Release a player's current name (when changing names or leaving)
   */
  async releaseName(playerId: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Find all names owned by this player
      const q = query(
        collection(db, 'player_names'),
        where('playerId', '==', playerId)
      );

      const querySnapshot = await getDocs(q);
      
      // Delete all found documents
      const deletePromises = querySnapshot.docs.map(docSnapshot => 
        deleteDoc(doc(db, 'player_names', docSnapshot.id))
      );

      await Promise.all(deletePromises);
      
      if (querySnapshot.docs.length > 0) {
        console.log('✅ Released', querySnapshot.docs.length, 'name(s) for player:', playerId);
      }
    } catch (error) {
      console.error('❌ Failed to release name:', error);
    }
  }

  /**
   * Update a player's name (releases old one and reserves new one)
   */
  async updatePlayerName(oldName: string, newName: string, playerId: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const trimmedNewName = newName.trim().toLowerCase();
      const trimmedOldName = oldName.trim().toLowerCase();

      // If names are the same, no need to update
      if (trimmedNewName === trimmedOldName) {
        return true;
      }

      // Check if new name is available
      const isAvailable = await this.isNameAvailable(trimmedNewName, playerId);
      if (!isAvailable) {
        console.log('🏷️ New name not available:', trimmedNewName);
        return false;
      }

      // Reserve the new name (this will also release the old one)
      return await this.reserveName(trimmedNewName, playerId);
    } catch (error) {
      console.error('❌ Failed to update player name:', error);
      return false;
    }
  }

  /**
   * Get the current name for a player ID, if any
   */
  async getPlayerName(playerId: string): Promise<string | null> {
    if (!this.isInitialized) {
      console.log('🏷️ NameValidationService: Initializing before getPlayerName...');
      await this.initialize();
    }

    try {
      console.log('🏷️ NameValidationService: Querying Firebase for player ID:', playerId);
      
      const q = query(
        collection(db, 'player_names'),
        where('playerId', '==', playerId)
      );

      console.log('🏷️ NameValidationService: Executing Firebase query...');
      const querySnapshot = await getDocs(q);
      console.log('🏷️ NameValidationService: Query completed. Empty:', querySnapshot.empty, 'Size:', querySnapshot.size);
      
      if (!querySnapshot.empty) {
        // Return the first (should be only) name for this player
        const doc = querySnapshot.docs[0];
        const playerData = doc.data();
        console.log('🏷️ NameValidationService: Found player data:', playerData);
        const playerName = playerData.playerName;
        console.log('🏷️ NameValidationService: Returning player name:', playerName);
        return playerName;
      }

      console.log('🏷️ NameValidationService: No documents found for player ID:', playerId);
      return null;
    } catch (error) {
      console.error('❌ NameValidationService: Failed to get player name:', error);
      console.error('❌ NameValidationService: Error details:', error.message);
      return null;
    }
  }

  /**
   * Check if a player has already submitted a name to Firebase
   */
  async hasPlayerSetName(playerId: string): Promise<boolean> {
    const playerName = await this.getPlayerName(playerId);
    return playerName !== null;
  }

  /**
   * Clear a player's name from Firebase (for complete data reset)
   */
  async clearPlayerName(playerId: string, playerName: string): Promise<boolean> {
    if (!this.isInitialized) {
      console.log('🏷️ NameValidationService: Initializing before clearPlayerName...');
      await this.initialize();
    }

    try {
      console.log('🏷️ NameValidationService: Clearing ALL names for player:', playerId);

      // Find ALL documents for this player ID (not just matching name)
      const q = query(
        collection(db, 'player_names'),
        where('playerId', '==', playerId)
      );

      const querySnapshot = await getDocs(q);
      console.log('🏷️ NameValidationService: Found', querySnapshot.size, 'documents to delete');

      if (!querySnapshot.empty) {
        // Delete ALL documents for this player
        for (const docSnapshot of querySnapshot.docs) {
          console.log('🏷️ NameValidationService: Deleting document:', docSnapshot.id, 'with data:', docSnapshot.data());
          await deleteDoc(doc(db, 'player_names', docSnapshot.id));
        }
        console.log('✅ NameValidationService: All player names cleared successfully');
        return true;
      }

      console.log('⚠️ NameValidationService: No names found to clear for player:', playerId);
      return false;
    } catch (error) {
      console.error('❌ NameValidationService: Failed to clear player name:', error);
      return false;
    }
  }

  /**
   * Get suggested alternative names when a name is taken
   */
  async getSuggestedNames(baseName: string): Promise<string[]> {
    const suggestions: string[] = [];
    const baseNameLower = baseName.trim().toLowerCase();

    // Generate variations
    const variations = [
      `${baseNameLower}1`,
      `${baseNameLower}2`,
      `${baseNameLower}3`,
      `${baseNameLower}_`,
      `${baseNameLower}x`,
      `the${baseNameLower}`,
      `${baseNameLower}pro`,
      `${baseNameLower}king`,
      `${baseNameLower}master`,
      `${baseNameLower}player`,
    ];

    // Check which variations are available
    for (const variation of variations) {
      const isAvailable = await this.isNameAvailable(variation);
      if (isAvailable) {
        suggestions.push(variation);
      }
      
      // Limit to 5 suggestions
      if (suggestions.length >= 5) {
        break;
      }
    }

    return suggestions;
  }
}

// Export singleton instance
export const nameValidationService = new NameValidationService();