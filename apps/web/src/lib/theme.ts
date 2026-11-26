export type ThemeSetting = "auto" | "day" | "night";

export function isNight(setting: ThemeSetting, deviceIsDark: boolean): boolean {
  return setting === "night" || (setting === "auto" && deviceIsDark);
}

export const THEME_BOOT_SCRIPT = `(function(){var setting="auto";var calm=false;try{var saved=JSON.parse(window.localStorage.getItem("bluff.settings")||"{}");if(saved&&(saved.theme==="day"||saved.theme==="night"))setting=saved.theme;calm=!!saved&&saved.calmMotion===true;}catch(error){console.warn("Bluff could not read the saved theme.",error);}var dark=setting==="night"||(setting==="auto"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",dark);document.documentElement.classList.toggle("calm",calm);})();`;
