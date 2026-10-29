import React from "react";
import { Composition, Folder, Sequence } from "remotion";
import { VIDEOS } from "./videos";
import { Backsound, VoiceTrack } from "./atlas/voice";
import { SfxTrack } from "./atlas/sfx";

/**
 * Tiap episode didaftarkan 3 kali:
 * - "<ID>"        30 fps (timeline asli, enak buat ngedit/preview di Studio)
 * - "<ID>-60fps"  60 fps, timeline yang sama diputar playbackRate 0,5 → tiap frame dihitung ulang (halus)
 * - "<ID>-Cover"  timeline desain tanpa voice (frame cover nggak geser walau durasi ngikut voice)
 * Voice, backsound & SFX ditaruh di luar wrapper 60fps biar kecepatannya normal.
 */
type V = (typeof VIDEOS)[number];
const Audio: React.FC<{ v: V }> = ({ v }) => (
  <>
    <VoiceTrack track={v.voice} />
    <Backsound id={v.id} />
    <SfxTrack hits={v.sfx} />
  </>
);
const at30 = (v: V): React.FC => {
  const C30: React.FC = () => (
    <>
      <v.component />
      <Audio v={v} />
    </>
  );
  return C30;
};
const at60 = (v: V): React.FC => {
  const C60: React.FC = () => (
    <>
      <Sequence playbackRate={0.5} layout="absolute-fill">
        <v.component />
      </Sequence>
      <Audio v={v} />
    </>
  );
  return C60;
};

export const RemotionRoot: React.FC = () => (
  <>
    {VIDEOS.map((v) => (
      <Folder key={v.id} name={v.id}>
        <Composition id={v.id} component={at30(v)} width={1080} height={1920} fps={30} durationInFrames={v.totalFrames} />
        <Composition id={`${v.id}-60fps`} component={at60(v)} width={1080} height={1920} fps={60} durationInFrames={v.totalFrames * 2} />
        <Composition id={`${v.id}-Cover`} component={v.cover} width={1080} height={1920} fps={30} durationInFrames={v.coverFrames} />
      </Folder>
    ))}
  </>
);
