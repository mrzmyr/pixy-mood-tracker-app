import noop from "lodash/noop";
import { useState } from "react";
import type { FeedbackSource } from "@/types/feedback";
import { useFeedback } from "../feedback";

/** What the user asks for. Each kind sends feedback of the same type. */
export type RequestKind = "emotion" | "role";

const SOURCES = {
  emotion: "logger",
  role: "people",
} as const satisfies Record<RequestKind, FeedbackSource>;

/**
 * Draft and send state of the request form (`/request`).
 *
 * The email goes out only while "Want a reply?" is on, so turning it off
 * drops a typed address. `send` resolves `true` only when the server accepted
 * the request. On failure `hasFailed` turns on and the draft stays.
 */
export const useRequestForm = (kind: RequestKind) => {
  const feedback = useFeedback();
  const [word, setWord] = useState("");
  const [wantsReply, setWantsReply] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "failed">("idle");

  const isSending = status === "sending";
  const canSend = word.trim().length > 0 && !isSending;
  const replyTo = wantsReply && email.trim() ? email.trim() : undefined;

  const send = async () => {
    if (!canSend) {
      return false;
    }
    setStatus("sending");
    // `feedback.send` never rejects: it resolves `false` on any failure.
    const isSent = await feedback.send({
      type: kind,
      source: SOURCES[kind],
      message: word.trim(),
      email: replyTo,
      // Replaces the error alert: the form shows the error inline.
      onCancel: noop,
    });
    setStatus(isSent ? "idle" : "failed");
    return isSent;
  };

  return {
    handleWordChange: setWord,
    wantsReply,
    handleWantsReplyChange: setWantsReply,
    handleEmailChange: setEmail,
    /** Address the reply goes to, or `undefined` without a reply. */
    replyTo,
    isSending,
    hasFailed: status === "failed",
    canSend,
    hasDraft: word.trim().length > 0 || email.trim().length > 0,
    send,
  };
};
