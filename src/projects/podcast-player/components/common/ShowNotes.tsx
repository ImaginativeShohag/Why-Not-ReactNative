import { Pressable, StyleSheet, Text, View } from "react-native";

import { PodcastTheme } from "@/src/projects/podcast-player/utils/color";
import { parseTimestamp } from "@/src/projects/podcast-player/utils/format";
import type { NoteLink } from "@/src/projects/podcast-player/utils/html";

type Props = {
  /** Already-sanitized plain text (see utils/html.ts). */
  text: string;
  links: NoteLink[];
  accent?: string;
  onOpenLink: (url: string) => void;
  onSeek: (seconds: number) => void;
};

const TIMESTAMP = /\b((?:\d{1,2}:)?\d{1,2}:\d{2})\b/g;

/**
 * Minimal, safe show-notes renderer: plain text where "12:34" timestamps are
 * tappable seek links, followed by the extracted http(s) links. No HTML is
 * interpreted, so publisher markup can't inject anything.
 */
export function ShowNotes({
  text,
  links,
  accent = PodcastTheme.accent,
  onOpenLink,
  onSeek,
}: Props) {
  const parts: { key: string; text: string; seconds: number | null }[] = [];
  let last = 0;
  let i = 0;
  for (const match of text.matchAll(TIMESTAMP)) {
    const start = match.index ?? 0;
    if (start > last)
      parts.push({
        key: `t${i++}`,
        text: text.slice(last, start),
        seconds: null,
      });
    parts.push({
      key: `s${i++}`,
      text: match[1],
      seconds: parseTimestamp(match[1]),
    });
    last = start + match[0].length;
  }
  if (last < text.length)
    parts.push({ key: `t${i++}`, text: text.slice(last), seconds: null });

  return (
    <View style={styles.box}>
      <Text style={styles.text} selectable>
        {parts.map((p) =>
          p.seconds != null ? (
            <Text
              key={p.key}
              style={[styles.stamp, { color: accent }]}
              onPress={() => onSeek(p.seconds!)}
              accessibilityRole="link"
              accessibilityLabel={`Play from ${p.text}`}
            >
              {p.text}
            </Text>
          ) : (
            <Text key={p.key}>{p.text}</Text>
          ),
        )}
      </Text>
      {links.length > 0 ? (
        <View style={styles.links}>
          <Text style={styles.linksTitle}>LINKS</Text>
          {links.slice(0, 30).map((l) => (
            <Pressable
              key={l.url}
              onPress={() => onOpenLink(l.url)}
              accessibilityRole="link"
            >
              <Text style={[styles.link, { color: accent }]} numberOfLines={2}>
                {l.text}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 16 },
  text: { color: PodcastTheme.text, fontSize: 15, lineHeight: 22 },
  stamp: { fontWeight: "700", textDecorationLine: "underline" },
  links: { gap: 10 },
  linksTitle: {
    color: PodcastTheme.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  link: { fontSize: 14 },
});
