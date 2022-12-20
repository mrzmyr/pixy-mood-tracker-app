import { wait } from "@/lib/utils";
import { ANSWER_DELAY, BotAnswer, SHOW_ANSWERS_DELAY, THINKING_DELAY, getQuestions } from "@/screens/BotLogger/config";
import _ from "lodash";
import { useEffect, useState } from "react";

type MessageAuthor = "bot" | "user";

export interface BotMessage {
  text: string;
  author: MessageAuthor;
}

export interface Bot {
  thinking: boolean;
  messages: BotMessage[];
  answers: BotAnswer[];
  on: (event: BotEventType, callback: (data: BotEventData) => void) => void;
  off: (event: BotEventType) => void;
  start: () => void;
}

export type BotEventType = "answer" | "close" | "save" | "message";
export type BotEventData = BotMessage | BotAnswer;

function usePubSub() {
  const [subscriptions, setSubscriptions] = useState({});

  function on(eventName: BotEventType, callback) {
    setSubscriptions(prevSubscriptions => {
      const newSubscriptions = { ...prevSubscriptions };
      if (!newSubscriptions[eventName]) {
        newSubscriptions[eventName] = [];
      }
      newSubscriptions[eventName].push(callback);
      return newSubscriptions;
    });
  }

  function off(eventName: BotEventType) {
    setSubscriptions(prevSubscriptions => {
      const newSubscriptions = { ...prevSubscriptions };
      newSubscriptions[eventName] = [];
      return newSubscriptions;
    });
  }

  function trigger(eventName: BotEventType, data: BotEventData) {
    subscriptions[eventName] && subscriptions[eventName].forEach(callback => callback(data));
  }

  useEffect(() => {
    return () => {
      setSubscriptions({});
    };
  }, []);

  return { on, off, trigger };
}

export const useBot = (): Bot => {

  const { on, off, trigger } = usePubSub();

  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [answers, setAnswers] = useState<BotAnswer[]>([]);
  const [thinking, setThinking] = useState<boolean>(false);

  const questions = getQuestions()

  const [questionIndex, setQuestionIndex] = useState<number>(0);

  const next = async (options: {
    messageText: string
  }) => {
    setAnswers([])

    if (options?.messageText) {
      post({
        text: options.messageText,
        author: 'user',
      })
    }

    setThinking(true)
    await wait(THINKING_DELAY)
    setThinking(false)

    setQuestionIndex(questionIndex + 1)
  }

  const start = async () => {
    setThinking(true)
    await wait(THINKING_DELAY)
    setThinking(false)
    post({
      text: 'Hey there! 👋',
      author: 'bot',
    })
    await wait(THINKING_DELAY)
    setThinking(true)
    await wait(ANSWER_DELAY)
    setThinking(false)
    post({
      text: 'I\'m so happy to see you today. 🫶',
      author: 'bot',
    })
    await wait(THINKING_DELAY)
    setThinking(true)
    await wait(ANSWER_DELAY)
    setThinking(false)
    post({
      text: questions[0].text,
      author: 'bot',
    })
    await wait(SHOW_ANSWERS_DELAY)
    _setAnswers(questions[0].answers)
  }

  const post = ({
    text,
    author
  }: {
    text: string;
    author: MessageAuthor
  }) => {
    trigger('message', {
      text,
      author,
    })
    setMessages((messages) => [
      ...messages,
      {
        text,
        author,
      },
    ]);
  };

  const _setAnswers = (answers: BotAnswer[]) => {
    const newAnswers = answers.map((answer) => {
      if (answer.action) {
        const prevAction = answer.action;
        answer.action = (options) => {
          trigger('answer', answer)
          prevAction({
            ...options,
            post,
            next,
            trigger,
            setThinking,
            setAnswers: _setAnswers,
          });
        };
      }

      return answer;
    });

    setAnswers(newAnswers);
  };

  useEffect(() => {
    (async () => {
      if (questionIndex === 0) return

      const nextQuestion = questions[questionIndex]
      post({
        text: nextQuestion.text,
        author: 'bot',
      })
      await wait(SHOW_ANSWERS_DELAY)
      _setAnswers(nextQuestion.answers)
    })()
  }, [questionIndex])

  return {
    thinking,
    messages,
    answers,
    start,
    on,
    off,
  }
}