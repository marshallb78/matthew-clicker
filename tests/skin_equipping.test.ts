import { describe, it, expect, beforeEach } from 'vitest';
import { getDefaultGameState, sanitizeAndValidateGameState, saveGame, loadGame, exportSaveString, importSaveString } from '../src/utils/storage';
import {
  SKINS,
  equipSkin,
  canEquipSkin,
  isSkinUnlocked,
  isValidSkinId,
  checkAndApplyMilestoneUnlocks,
  getSkinMilestoneProgress,
} from '../src/data/skins';
import { GameState } from '../src/types/game';
import fs from 'fs';
import path from 'path';

describe('Automatic Skin Equipping & Locked Skin Access Enforcement', () => {
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

  describe('Scenario 1 & 2: Automatically equip newly unlocked Matthews & immediate art display', () => {
    it('automatically equips newly unlocked Matthew upon completing milestone without spending coins', () => {
      expect(state.equippedSkin).toBe('classic_matthew');
      expect(state.unlockedSkins).toEqual(['classic_matthew']);
      expect(state.coins).toBe(0);

      // Complete Aura Matthew milestone (100 clicks)
      state.clicks = 100;
      state.coins = 500;

      const { state: updatedState, newlyUnlocked } = checkAndApplyMilestoneUnlocks(state, 0);

      expect(newlyUnlocked.length).toBe(1);
      expect(newlyUnlocked[0].id).toBe('aura_matthew');
      expect(updatedState.unlockedSkins).toContain('aura_matthew');
      expect(updatedState.equippedSkin).toBe('aura_matthew');
      // Zero coin deduction
      expect(updatedState.coins).toBe(500);

      // Verify character artwork changes immediately
      const equippedSkinData = SKINS.find((s) => s.id === updatedState.equippedSkin);
      expect(equippedSkinData).toBeDefined();
      expect(equippedSkinData?.image).toBe('./images/skins/aura-normal.png');
    });

    it('works for every skin, including God Matthew at 10,000,000 lifetime coins', () => {
      state.lifetimeCoins = 10000000;
      const { state: updatedState, newlyUnlocked } = checkAndApplyMilestoneUnlocks(state, 0);

      expect(updatedState.unlockedSkins).toContain('god_matthew');
      expect(updatedState.equippedSkin).toBe('god_matthew');

      const godSkin = SKINS.find((s) => s.id === updatedState.equippedSkin);
      expect(godSkin?.id).toBe('god_matthew');
      expect(godSkin?.image).toBe('./images/skins/god-normal.png');
      expect(godSkin?.rarity).toBe('Divine');
    });
  });

  describe('Scenario 3: Browser refresh persistence', () => {
    it('persists the equipped skin across save and reload cycles', () => {
      // Simulate player earning Aura Matthew
      state.clicks = 100;
      const { state: unlockedState } = checkAndApplyMilestoneUnlocks(state, 0);
      expect(unlockedState.equippedSkin).toBe('aura_matthew');

      // Save to storage
      saveGame(unlockedState);

      // Simulate refresh by loading from storage
      const reloaded = loadGame();
      expect(reloaded.equippedSkin).toBe('aura_matthew');
      expect(reloaded.unlockedSkins).toContain('aura_matthew');

      // Now player manually switches back to Classic Matthew
      const switchedBack = equipSkin(reloaded, 'classic_matthew');
      expect(switchedBack.equippedSkin).toBe('classic_matthew');
      saveGame(switchedBack);

      // Simulate another refresh - should NOT forcibly re-equip aura_matthew on reload
      const reloaded2 = loadGame();
      expect(reloaded2.equippedSkin).toBe('classic_matthew');
      expect(reloaded2.unlockedSkins).toContain('aura_matthew');
    });
  });

  describe('Scenario 4: Authoritative lock enforcement against illegitimate equip requests', () => {
    it('rejects equipping locked skins and leaves equippedSkin and state unchanged', () => {
      expect(state.unlockedSkins).toEqual(['classic_matthew']);
      expect(state.equippedSkin).toBe('classic_matthew');

      // Attempt to equip locked God Matthew
      const result1 = equipSkin(state, 'god_matthew');
      expect(result1.equippedSkin).toBe('classic_matthew');
      expect(result1).toBe(state); // Identical reference, rejected

      // Attempt to equip locked Aura Matthew
      const result2 = equipSkin(state, 'aura_matthew');
      expect(result2.equippedSkin).toBe('classic_matthew');
      expect(result2).toBe(state);

      // Attempt to equip non-existent skin
      const result3 = equipSkin(state, 'non_existent_matthew');
      expect(result3.equippedSkin).toBe('classic_matthew');
      expect(result3).toBe(state);

      // Attempt with empty / invalid input
      const result4 = equipSkin(state, '');
      expect(result4.equippedSkin).toBe('classic_matthew');
      expect(result4).toBe(state);
    });

    it('correctly verifies canEquipSkin and isSkinUnlocked helper functions', () => {
      expect(canEquipSkin(state, 'classic_matthew')).toBe(true);
      expect(canEquipSkin(state, 'god_matthew')).toBe(false);
      expect(canEquipSkin(state, 'invalid_id')).toBe(false);

      expect(isSkinUnlocked(state, 'classic_matthew')).toBe(true);
      expect(isSkinUnlocked(state, 'god_matthew')).toBe(false);

      expect(isValidSkinId('classic_matthew')).toBe(true);
      expect(isValidSkinId('god_matthew')).toBe(true);
      expect(isValidSkinId('fake_matthew')).toBe(false);
    });
  });

  describe('Scenario 5: Complete removal of skin selector and equip controls from Settings', () => {
    it('verifies SettingsModal source file contains no skin selection or viewing controls', () => {
      const settingsModalPath = path.resolve(__dirname, '../src/components/SettingsModal.tsx');
      const settingsContent = fs.readFileSync(settingsModalPath, 'utf8');

      // Must not contain SkinQualityModal or skin equip/inspector elements
      expect(settingsContent).not.toContain('SkinQualityModal');
      expect(settingsContent).not.toContain('onOpenSkinQualityModal');
      expect(settingsContent).not.toContain('16-Skin Quality Control Inspector');
      expect(settingsContent).not.toContain('Inspect All 16 Skins');
      expect(settingsContent).not.toContain('equippedSkin');
      expect(settingsContent).not.toContain('equipSkin');

      // Must retain sound, visuals, stats, and save preferences
      expect(settingsContent).toContain('Audio Controls');
      expect(settingsContent).toContain('Visuals & Accessibility');
      expect(settingsContent).toContain('Career Statistics');
      expect(settingsContent).toContain('Save Management');
    });
  });

  describe('Scenario 6: Load save with invalid or locked equipped skin and fallback safely', () => {
    it('safely switches locked equippedSkin to Classic Matthew and never grants unearned skins', () => {
      const fraudulentSave = {
        coins: 10,
        lifetimeCoins: 50,
        clicks: 5,
        equippedSkin: 'god_matthew', // Claiming God Matthew without earning it!
        unlockedSkins: ['classic_matthew'],
      };

      const sanitized = sanitizeAndValidateGameState(fraudulentSave);

      // God Matthew MUST NOT be granted
      expect(sanitized.unlockedSkins).not.toContain('god_matthew');
      expect(sanitized.unlockedSkins).toEqual(['classic_matthew']);
      // Fallback to Classic Matthew
      expect(sanitized.equippedSkin).toBe('classic_matthew');
    });

    it('safely handles missing or completely invalid equippedSkin IDs', () => {
      const corruptSave = {
        coins: 100,
        equippedSkin: 'hacked_skin_xyz',
        unlockedSkins: ['classic_matthew'],
      };

      const sanitized = sanitizeAndValidateGameState(corruptSave);
      expect(sanitized.equippedSkin).toBe('classic_matthew');
    });

    it('safely handles corrupt unlockedSkins array by sanitizing it', () => {
      const corruptSave = {
        equippedSkin: 'classic_matthew',
        unlockedSkins: ['classic_matthew', 'hacked_skin_1', 'hacked_skin_2', 123, null],
      };

      const sanitized = sanitizeAndValidateGameState(corruptSave);
      expect(sanitized.unlockedSkins).toEqual(['classic_matthew']);
    });
  });

  describe('Scenario 7: Switching between previously unlocked skins', () => {
    it('allows player to freely switch between any previously unlocked skins', () => {
      state.unlockedSkins = ['classic_matthew', 'aura_matthew', 'sad_matthew'];
      state.equippedSkin = 'classic_matthew';

      // Switch to Aura Matthew
      state = equipSkin(state, 'aura_matthew');
      expect(state.equippedSkin).toBe('aura_matthew');

      // Switch to Sad Matthew
      state = equipSkin(state, 'sad_matthew');
      expect(state.equippedSkin).toBe('sad_matthew');

      // Switch back to Classic Matthew
      state = equipSkin(state, 'classic_matthew');
      expect(state.equippedSkin).toBe('classic_matthew');
    });
  });

  describe('Scenario 8: Deterministic multi-unlock without duplicates or thrashing', () => {
    it('deterministically unlocks multiple skins and equips the highest-tier without duplicate cycles', () => {
      // Simulate jumping from 0 to 1,500 clicks and 60,000 lifetime coins
      state.clicks = 1500; // Unlocks Aura Matthew (100) & Angry Matthew (1000)
      state.lifetimeCoins = 60000; // Unlocks Sad Matthew (500), Golden Matthew (10000), Diamond Matthew (50000)

      const { state: updatedState, newlyUnlocked } = checkAndApplyMilestoneUnlocks(state, 0);

      // 5 skins unlocked in this single event
      expect(newlyUnlocked.length).toBe(5);
      const newlyUnlockedIds = newlyUnlocked.map((s) => s.id);
      expect(newlyUnlockedIds).toContain('aura_matthew');
      expect(newlyUnlockedIds).toContain('angry_matthew');
      expect(newlyUnlockedIds).toContain('sad_matthew');
      expect(newlyUnlockedIds).toContain('golden_matthew');
      expect(newlyUnlockedIds).toContain('diamond_matthew');

      // Deterministic final equipped skin: Diamond Matthew (highest progression skin among newly unlocked)
      expect(updatedState.equippedSkin).toBe('diamond_matthew');

      // Running milestone check again immediately yields ZERO new unlocks (no duplicates or skin thrashing)
      const secondCheck = checkAndApplyMilestoneUnlocks(updatedState, 0);
      expect(secondCheck.newlyUnlocked.length).toBe(0);
      expect(secondCheck.state.equippedSkin).toBe('diamond_matthew');
    });

    it('handles cascading milestones such as Rainbow Matthew requiring 12 forms unlocked', () => {
      // Start with 11 unlocked skins
      const elevenSkins = SKINS.slice(0, 11).map((s) => s.id);
      state.unlockedSkins = elevenSkins;
      state.equippedSkin = elevenSkins[0];

      // Player earns 1 more skin (Sleepy Matthew via 50 upgrades)
      state.upgrades = { finger_exercise: 50 };

      const { state: updatedState, newlyUnlocked } = checkAndApplyMilestoneUnlocks(state, 0);

      // Sleepy Matthew unlocks, which brings total unlocked skins to 12, triggering Rainbow Matthew!
      expect(newlyUnlocked.map((s) => s.id)).toContain('sleepy_matthew');
      expect(newlyUnlocked.map((s) => s.id)).toContain('rainbow_matthew');
      expect(updatedState.unlockedSkins).toContain('rainbow_matthew');
      // Deterministically equips the higher tier (Rainbow Matthew)
      expect(updatedState.equippedSkin).toBe('rainbow_matthew');
    });
  });

  describe('Scenario 9: Gameplay progress preservation', () => {
    it('preserves all upgrades, coins, lifetimeCoins, prestige stats, and achievements intact', () => {
      state.coins = 77777;
      state.lifetimeCoins = 999999;
      state.clicks = 4321;
      state.criticalClicks = 123;
      state.upgrades = { finger_exercise: 15, autoclicker_bot: 10, coffee_supply: 8 };
      state.prestigeCount = 3;
      state.prestigeShards = 45;
      state.lifetimePrestigeShards = 120;
      state.prestigeUpgrades = { golden_touch: 2 };
      state.unlockedAchievements = ['first_click', 'thousand_clicks'];
      state.totalPlaytimeSeconds = 3600;
      state.goldenMatthewsClicked = 7;
      state.unlockedSkins = ['classic_matthew', 'rich_matthew'];
      state.equippedSkin = 'rich_matthew';

      const exported = exportSaveString(state);
      const imported = importSaveString(exported);

      expect(imported.coins).toBe(77777);
      expect(imported.lifetimeCoins).toBe(999999);
      expect(imported.clicks).toBe(4321);
      expect(imported.criticalClicks).toBe(123);
      expect(imported.upgrades).toEqual({ finger_exercise: 15, autoclicker_bot: 10, coffee_supply: 8 });
      expect(imported.prestigeCount).toBe(3);
      expect(imported.prestigeShards).toBe(45);
      expect(imported.lifetimePrestigeShards).toBe(120);
      expect(imported.prestigeUpgrades).toEqual({ golden_touch: 2 });
      expect(imported.unlockedAchievements).toEqual(['first_click', 'thousand_clicks']);
      expect(imported.totalPlaytimeSeconds).toBe(3600);
      expect(imported.goldenMatthewsClicked).toBe(7);
      expect(imported.equippedSkin).toBe('rich_matthew');
    });
  });
});
