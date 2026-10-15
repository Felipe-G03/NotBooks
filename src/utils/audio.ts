/**
 * Audio disabled per user request
 */
class SilentAudio {
  public enabled: boolean = false;
  public playPageFlip(): void {}
  public playPencilScratch(): void {}
  public playBookmarkSnap(): void {}
  public playBookOpen(): void {}
}

export const sound = new SilentAudio();
