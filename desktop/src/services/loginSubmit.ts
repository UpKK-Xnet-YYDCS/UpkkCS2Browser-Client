export const STEAM_SECURE_CODE_URL =
  'https://bbs.upkk.com/plugin.php?id=xnet_steam_openid:SoftLogin_getsecurecode';

export function canSubmitSteamLogin(steamid64: string, securecode: string): boolean {
  return Boolean(steamid64.trim() && securecode.trim());
}
