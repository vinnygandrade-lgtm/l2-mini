import { test, expect } from '@playwright/test';
import { bootstrapSmokeHero, waitForGameBoot } from '../helpers/game-fixtures';

test.describe('Combat math (TS module)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForGameBoot(page);
    await bootstrapSmokeHero(page);
  });

  test('atacar applies damage to mob via aplicarDanoNoMonstro', async ({ page }) => {
    const state = await page.evaluate(() => {
      window.globalCooldownAtivo = 0;
      window.monstrosAtivos = [
        {
          idUnico: 'smoke-mob-1',
          hp: 5000,
          maxHp: 5000,
          atk: 50,
          def: 30,
          pDef: 30,
          atkSpd: 3000,
          idImg: 'wolf',
          progresso: 0,
        },
      ];
      window.playerStats = { ...window.playerStats, pAtk: 200, mAtk: 100, atkSpeed: 500 };
      window.autoAtaqueAtivo = false;

      window.atacar?.();
      const mob = window.monstrosAtivos[0] as { hp?: number } | undefined;
      return {
        hp: mob ? Math.floor(Number(mob.hp)) : 0,
        mobGone: !mob,
        autoOn: window.autoAtaqueAtivo,
      };
    });

    expect(state.autoOn).toBe(true);
    expect(state.mobGone || state.hp < 5000).toBe(true);
  });

  test('player defeat flow runs escreverLog without error', async ({ page }) => {
    const result = await page.evaluate(() => {
      window.playerStats = { ...window.playerStats, maxHp: 300, pDef: 10, mDef: 10 };
      window.playerHP = 5;
      let logCalled = false;
      const prev = escreverLog;
      (window as Window & { escreverLog: typeof escreverLog }).escreverLog = (msg: string) => {
        logCalled = true;
        prev(msg);
      };

      window.executarDanoDeUmMonstro?.({
        atk: 9999,
        tipo: 'fisico',
        lvl: 99,
      });

      return {
        playerHP: window.playerHP,
        autoOff: !window.autoAtaqueAtivo,
        logCalled,
      };
    });

    expect(result.playerHP).toBeGreaterThanOrEqual(1);
    expect(result.autoOff).toBe(true);
    expect(result.logCalled).toBe(true);
  });
});
