import { addIcon } from "obsidian";

export const TASK_HUB_ICON_ID = "task-hub";

const TASK_HUB_ICON_SVG = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M7 4.75h10a2.25 2.25 0 0 1 2.25 2.25v10a2.25 2.25 0 0 1-2.25 2.25H7A2.25 2.25 0 0 1 4.75 17V7A2.25 2.25 0 0 1 7 4.75Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
  <path d="M8 8.25h.01M8 12h.01M8 15.75h.01" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M10.75 8.25h5.25M10.75 12h4.4M10.75 15.75h3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
  <path d="M15.25 15.75 17.25 17.75 20 14.25" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

export function registerTaskHubIcon(): void {
  addIcon(TASK_HUB_ICON_ID, TASK_HUB_ICON_SVG);
}
