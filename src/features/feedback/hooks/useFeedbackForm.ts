import noop from "lodash/noop";
import { useState } from "react";
import { useFeedback } from "../Feedback";
import type { FeedackType, FeedbackSource } from "../Feedback";

/**
 * Draft and send state of the feedback form. Shared by the feedback route
 * and the storage error fallback modal.
 *
 * `send` resolves `true` only when the server accepted the message, after
 * the success toast. On failure, `status` turns `failed` for an inline
 * error, no alert shows, and the draft stays, so Send retries it.
 */
export const useFeedbackForm = (
  type: FeedackType,
  source: FeedbackSource = "modal"
) => {
  const feedback = useFeedback();
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "failed">("idle");

  const isSending = status === "sending";
  const canSend = message.trim().length > 0 && !isSending;

  const send = async () => {
    if (!canSend) {
      return false;
    }
    setStatus("sending");
    // `feedback.send` never rejects: it resolves `false` on any failure.
    const isSent = await feedback.send({
      type,
      message,
      email,
      source,
      // Replaces the error alert: the form shows the error inline.
      onCancel: noop,
    });
    setStatus(isSent ? "idle" : "failed");
    return isSent;
  };

  return {
    message,
    handleMessageChange: setMessage,
    email,
    handleEmailChange: setEmail,
    isSending,
    hasFailed: status === "failed",
    canSend,
    hasDraft: message.length > 0 || email.length > 0,
    send,
  };
};
