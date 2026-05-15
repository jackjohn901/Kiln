import React, { useState, useRef } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";

interface Message {
  id: string;
  text: string;
  fromMe: boolean;
  time: string;
}

const DEMO_MSGS: Message[] = [
  { id: "1", text: "Hey! Love your recent ceramics post — the glaze is stunning.", fromMe: false, time: "10:32 AM" },
  { id: "2", text: "Thank you so much! It took 3 tries to get the oxidation right 😅", fromMe: true, time: "10:35 AM" },
  { id: "3", text: "Worth it. What kiln temp did you end up using?", fromMe: false, time: "10:36 AM" },
  { id: "4", text: "Around 2300°F in a reduction atmosphere. The colour shift is all from the copper in the glaze.", fromMe: true, time: "10:38 AM" },
  { id: "5", text: "That makes sense. I've been experimenting with iron for a more subtle effect.", fromMe: false, time: "10:40 AM" },
];

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>(DEMO_MSGS);
  const [draft, setDraft] = useState("");
  const flatRef = useRef<FlatList>(null);

  const send = () => {
    if (!draft.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const msg: Message = {
      id: Date.now().toString(),
      text: draft.trim(),
      fromMe: true,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, msg]);
    setDraft("");
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.fromMe
                ? [styles.bubbleMe, { backgroundColor: colors.primary }]
                : [styles.bubbleThem, { backgroundColor: colors.card, borderColor: colors.border }],
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                { color: item.fromMe ? colors.primaryForeground : colors.foreground },
              ]}
            >
              {item.text}
            </Text>
            <Text
              style={[
                styles.bubbleTime,
                { color: item.fromMe ? `${colors.primaryForeground}99` : colors.mutedForeground },
              ]}
            >
              {item.time}
            </Text>
          </View>
        )}
        onLayout={() => flatRef.current?.scrollToEnd({ animated: false })}
      />
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: bottomPad,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border },
          ]}
          placeholder="Message…"
          placeholderTextColor={colors.mutedForeground}
          value={draft}
          onChangeText={setDraft}
          returnKeyType="send"
          onSubmitEditing={send}
          multiline
          maxLength={1000}
        />
        <Pressable
          style={[
            styles.sendBtn,
            { backgroundColor: draft.trim() ? colors.primary : colors.muted },
          ]}
          onPress={send}
          disabled={!draft.trim()}
        >
          <Feather name="send" size={18} color={draft.trim() ? colors.primaryForeground : colors.mutedForeground} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bubble: {
    maxWidth: "78%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  bubbleMe: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  bubbleThem: { alignSelf: "flex-start", borderWidth: 1, borderBottomLeftRadius: 4 },
  bubbleText: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 21 },
  bubbleTime: { fontFamily: "Inter_400Regular", fontSize: 11, alignSelf: "flex-end" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 10,
  },
  input: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
