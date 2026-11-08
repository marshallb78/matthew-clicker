import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDefaultGameState,
  sanitizeAndValidateGameState,
  saveGame,
  loadGame,
} from '../src/utils/storage';
import {
  ALL_SKINS,
  equipSkin,
  canEquipSkin,
  isSkinUnlocked,
  isValidSkinId,
  checkAndApplyMilestoneUnlocks,
} from '../src/data/skins';
import { GameState } from '../src/types/game';
import fs from 'fs';
import path from 'path';

describe('Automatic Skin Equipping, Locked Skin Enforcement & Fast-Click Animation Tests', () => {
  let state: GameState;
  const storageMap = new Map<string, string>();

  beforeEach(() => {
    state = getDefaultGameState();
    storageMap.clear();

    const localStorageMock = {
      getItem: (key: string) => storageMap.get(key) || null,
      setItem: (key: string, val: string) => storageMap.set(key, String(val)),
      removeItem: (key: string) => storageMap.delete(key),
      clear: () => storageMap.clear(),
    };

    (globalThis as any).window = {
      localStorage: localStorageMock,
    };
    (globalThis as any).localStorage = localStorageMock;
  });

  describe('Scenario 1 & 2: Automatically equip newly unlocked Matthews & replaceable placeholder assets', () => {
    it('automatically equips newly unlocked Matthew upon completing point milestone without spending coins', () => {
      expect(state.equippedSkin).toBe('classic_matthew');
      expect(state.unlockedSkins).toEqual(['classic_matthew']);
      expect(state.coins).toBe(0);

      // Complete Broke Matthew milestone (2,500 lifetime points)
      state.lifetimeCoins = 2500;
      state.coins = 2500;

      const { state: updatedState, newlyUnlocked } = checkAndApplyMilestoneUnlocks(state, 0);

      expect(newlyUnlocked.length).toBe(1);
      expect(newlyUnlocked[0].id).toBe('broke_matthew');
      expect(updatedState.unlockedSkins).toContain('broke_matthew');
      expect(updatedState.equippedSkin).toBe('broke_matthew');
      expect(updatedState.coins).toBe(2500);

      const equippedSkinData = ALL_SKINS.find((s) => s.id === updatedState.equippedSkin);
      expect(equippedSkinData).toBeDefined();
      expect(equippedSkinData?.image).toBe('./images/skins/broke_matthew.png');
    });

    it('works for every skin, including God Matthew at 100 Octillion (1e29) points', () => {
      state.lifetimeCoins = 1e29;
      const { state: updatedState } = checkAndApplyMilestoneUnlocks(state, 0);

      expect(updatedState.unlockedSkins).toContain('god_matthew');
      expect(updatedState.equippedSkin).toBe('god_matthew');

      const godSkin = ALL_SKINS.find((s) => s.id === updatedState.equippedSkin);
      expect(godSkin?.id).toBe('god_matthew');
      expect(godSkin?.image).toBe('./images/skins/god_matthew.png');
      expect(godSkin?.rarity).toBe('Divine');
    });

    it('verifies every single skin in ALL_SKINS points to an existing replaceable placeholder asset on disk', () => {
      ALL_SKINS.forEach((skin) => {
        const relPath = skin.image.replace(/^\.\//, '');
        const diskPath = path.resolve(__dirname, '../public', relPath);
        expect(fs.existsSync(diskPath)).toBe(true);
      });
    });
  });

  describe('Scenario 3: Browser refresh persistence', () => {
    it('persists the equipped skin across save and reload cycles', () => {
      state.lifetimeCoins = 100000;
      const { state: unlockedState } = checkAndApplyMilestoneUnlocks(state, 0);
      expect(unlockedState.equippedSkin).toBe('sad_matthew');

      saveGame(unlockedState);

      const reloaded = loadGame();
      expect(reloaded.equippedSkin).toBe('sad_matthew');
      expect(reloaded.unlockedSkins).toContain('sad_matthew');

      const switchedBack = equipSkin(reloaded, 'classic_matthew');
      expect(switchedBack.equippedSkin).toBe('classic_matthew');
      saveGame(switchedBack);

      const reloaded2 = loadGame();
      expect(reloaded2.equippedSkin).toBe('classic_matthew');
      expect(reloaded2.unlockedSkins).toContain('sad_matthew');
    });
  });

  describe('Scenario 4: Authoritative lock enforcement against illegitimate equip requests', () => {
    it('rejects equipping locked skins and leaves equippedSkin and state unchanged', () => {
      expect(state.unlockedSkins).toEqual(['classic_matthew']);
      expect(state.equippedSkin).toBe('classic_matthew');

      const result1 = equipSkin(state, 'god_matthew');
      expect(result1.equippedSkin).toBe('classic_matthew');
      expect(result1).toBe(state);

      const result2 = equipSkin(state, 'matthew_storm_skin_1');
      expect(result2.equippedSkin).toBe('classic_matthew');
      expect(result2).toBe(state);

      const result3 = equipSkin(state, 'non_existent_matthew');
      expect(result3.equippedSkin).toBe('classic_matthew');
      expect(result3).toBe(state);
    });

    it('correctly verifies canEquipSkin, isSkinUnlocked, and isValidSkinId across all skins', () => {
      expect(canEquipSkin(state, 'classic_matthew')).toBe(true);
      expect(canEquipSkin(state, 'god_matthew')).toBe(false);
      expect(canEquipSkin(state, 'matthew_storm_skin_1')).toBe(false);
      expect(canEquipSkin(state, 'champion_matthew')).toBe(false);

      expect(isSkinUnlocked(state, 'classic_matthew')).toBe(true);
      expect(isSkinUnlocked(state, 'mathjew')).toBe(false);

      expect(isValidSkinId('classic_matthew')).toBe(true);
      expect(isValidSkinId('mathjew')).toBe(true);
      expect(isValidSkinId('mathgoon')).toBe(false);
      expect(isValidSkinId('matthew_storm_skin_5')).toBe(true);
      expect(isValidSkinId('fake_matthew')).toBe(false);
    });
  });

  describe('Scenario 5: Complete removal of skin selector and Save Management from Settings & Fast-Click Animation', () => {
    it('verifies SettingsModal source file contains no skin selection or manual save management controls', () => {
      const settingsModalPath = path.resolve(__dirname, '../src/components/SettingsModal.tsx');
      const settingsContent = fs.readFileSync(settingsModalPath, 'utf8');

      expect(settingsContent).not.toContain('SkinQualityModal');
      expect(settingsContent).not.toContain('onOpenSkinQualityModal');
      expect(settingsContent).not.toContain('equippedSkin');
      expect(settingsContent).not.toContain('equipSkin');
      expect(settingsContent).not.toContain('Save Management');

      expect(settingsContent).toContain('Audio Controls');
      expect(settingsContent).toContain('Visuals &amp; Accessibility');
    });

    it('verifies ClickerArea uses restartable Web Animations API and 20s rapid-clicking zoom overdrive', () => {
      const clickerPath = path.resolve(__dirname, '../src/components/ClickerArea.tsx');
      const clickerContent = fs.readFileSync(clickerPath, 'utf8');

      expect(clickerContent).not.toContain('isSquashing');
      expect(clickerContent).toContain('triggerRestartableBounce');
      expect(clickerContent).toContain('OVERDRIVE_TARGET_SECONDS');
    });
  });

  describe('Scenario 6: Load save with invalid or locked equipped skin and fallback safely', () => {
    it('safely switches locked equippedSkin to Classic Matthew and never grants unearned skins', () => {
      const fraudulentSave = {
        coins: 10,
        lifetimeCoins: 50,
        clicks: 5,
        equippedSkin: 'god_matthew',
        unlockedSkins: ['classic_matthew'],
      };

      const sanitized = sanitizeAndValidateGameState(fraudulentSave);

      expect(sanitized.unlockedSkins).not.toContain('god_matthew');
      expect(sanitized.unlockedSkins).toEqual(['classic_matthew']);
      expect(sanitized.equippedSkin).toBe('classic_matthew');
    });
  });

  describe('Scenario 7 & 8: Deterministic multi-unlock without duplicates or thrashing', () => {
    it('deterministically unlocks multiple point-based skins and equips the highest-tier without duplicate cycles', () => {
      state.lifetimeCoins = 1500000000; // Unlocks broke_matthew (2.5K), sad_matthew (100K), sleepy_matthew (10M), angry_matthew (1B)

      const { state: updatedState, newlyUnlocked } = checkAndApplyMilestoneUnlocks(state, 0);

      const newlyUnlockedIds = newlyUnlocked.map((s) => s.id);
      expect(newlyUnlockedIds).toContain('broke_matthew');
      expect(newlyUnlockedIds).toContain('sad_matthew');
      expect(newlyUnlockedIds).toContain('sleepy_matthew');
      expect(newlyUnlockedIds).toContain('angry_matthew');
      expect(updatedState.equippedSkin).toBe('angry_matthew');

      const secondCheck = checkAndApplyMilestoneUnlocks(updatedState, 0);
      expect(secondCheck.newlyUnlocked.length).toBe(0);
      expect(secondCheck.state.equippedSkin).toBe('angry_matthew');
    });
  });
});
