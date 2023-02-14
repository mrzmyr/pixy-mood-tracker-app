import { useTemporaryLog } from '@/hooks/useTemporaryLog';
import { useNavigation } from '@react-navigation/native';
import { wait } from "@/lib/utils";
import { ANSWER_DELAY, BotAnswer, BotQuestion, SHOW_ANSWERS_DELAY, THINKING_DELAY, useBotQuestions } from "@/screens/BotLogger/useBotQuestions";
import { useEffect, useState } from "react";
import _ from 'lodash';
import { t } from '@/helpers/translation';

type MessageAuthor = "bot" | "user";

export interface BotMessage {
  text: string;
  author: MessageAuthor;
}

export interface Bot {
  thinking: boolean;
  messages: BotMessage[];
  answers: BotAnswer[];
  questions: BotQuestion[];
  didStart: boolean;
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

  const tempLog = useTemporaryLog();
  const navigation = useNavigation();

  const { on, off, trigger } = usePubSub();

  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [answers, setAnswers] = useState<BotAnswer[]>([]);
  const [thinking, setThinking] = useState<boolean>(false);

  const [questions, setQuestions] = useBotQuestions()

  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [didStart, setDidStart] = useState<boolean>(false);

  const think = async () => {
    setThinking(true)
    await wait(_.random(THINKING_DELAY * 0.5, THINKING_DELAY))
    setThinking(false)
  }

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

    await think()

    setQuestionIndex(questionIndex + 1)
  }

  const start = async () => {
    await think()
    post({
      text: t('bot_intro_text_1'),
      author: 'bot',
    })
    await wait(THINKING_DELAY)
    setThinking(true)
    await wait(ANSWER_DELAY)
    setThinking(false)
    post({
      text: t('bot_intro_text_2'),
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
    setDidStart(true)
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
            finish: () => {
              setAnswers([])
              setQuestionIndex(questions.length - 2)
            },
            setThinking,
            setAnswers: _setAnswers,
            questions,
            tempLog,
            setQuestions,
            navigation,
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
    didStart,
    questions,
    thinking,
    messages,
    answers,
    start,
    on,
    off,
  }
}