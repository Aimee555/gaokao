import { useEffect, useRef, useState } from 'react';
import HomeScreen from './components/HomeScreen';
import QuestionnaireScreen from './components/QuestionnaireScreen';
import LoadingScreen from './components/LoadingScreen';
import ResultScreen from './components/ResultScreen';
import CareerScreen from './components/CareerScreen';
import MajorScreen from './components/MajorScreen';
import CaptchaGate from './components/CaptchaGate';
import { postRecommend, hasSession } from './lib/api';
import { track } from './lib/analytics';
import type {
  QuestionnaireMode,
  RawAnswer,
  RecommendResponse,
} from './types';

type Step = 'home' | 'questionnaire' | 'loading' | 'result' | 'career' | 'major';

export default function App() {
  const [step, setStep] = useState<Step>('home');
  const [mode, setMode] = useState<QuestionnaireMode | null>(null);
  const [answers, setAnswers] = useState<RawAnswer[]>([]);
  const [result, setResult] = useState<RecommendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 进站埋点：每次打开页面记一次（漏斗起点 / PV / UV / 来源 / 设备）。
  useEffect(() => {
    track('app_open');
  }, []);

  const enterCareer = () => {
    track('view_career');
    setStep('career');
  };

  // 进入「职业」环节是第一处 AI 调用：没有有效会话时先弹人机验证。
  const goCareers = () => {
    if (hasSession()) enterCareer();
    else {
      track('captcha_shown');
      setShowCaptcha(true);
    }
  };

  const reset = () => {
    setMode(null);
    setAnswers([]);
    setResult(null);
    setError(null);
    setStep('home');
  };

  const startMode = (m: QuestionnaireMode) => {
    track('start_mode', { mode: m });
    setMode(m);
    setAnswers([]);
    setResult(null);
    setError(null);
    setStep('questionnaire');
  };

  const submitAnswers = async (a: RawAnswer[]) => {
    if (!mode) return;
    track('submit_answers', { mode, count: a.length });
    setAnswers(a);
    setStep('loading');
    setError(null);
    try {
      const res = await postRecommend(mode, a);
      setResult(res);
      track('view_result', { mode });
      setStep('result');
    } catch (e) {
      setError(e instanceof Error ? e.message : '推荐计算失败');
    }
  };

  const retryRecommend = () => {
    if (!mode || answers.length === 0) {
      reset();
      return;
    }
    submitAnswers(answers);
  };

  const retake = () => {
    setResult(null);
    setError(null);
    if (mode) setStep('questionnaire');
    else setStep('home');
  };

  return (
    <div className="stage">
      {step === 'home' && <HomeScreen onStart={startMode} />}
      {step === 'questionnaire' && mode && (
        <QuestionnaireScreen mode={mode} onSubmit={submitAnswers} onBack={reset} />
      )}
      {step === 'loading' && (
        <LoadingScreen
          error={error}
          onRetry={retryRecommend}
          onBack={reset}
        />
      )}
      {step === 'result' && result && mode && (
        <ResultScreen
          result={result}
          mode={mode}
          onRestart={reset}
          onRetake={retake}
          onCareers={goCareers}
          scrollRef={scrollRef}
        />
      )}
      {showCaptcha && (
        <CaptchaGate
          onVerified={() => {
            track('captcha_passed');
            setShowCaptcha(false);
            enterCareer();
          }}
          onCancel={() => setShowCaptcha(false)}
        />
      )}
      {step === 'career' && mode && result && (
        <CareerScreen
          mode={mode}
          answers={answers}
          initialCareer={result.career_result}
          onBack={() => setStep('result')}
          onMajors={() => {
            track('view_major');
            setStep('major');
          }}
          onRestart={reset}
        />
      )}
      {step === 'major' && mode && result && (
        <MajorScreen
          mode={mode}
          answers={answers}
          initialMajor={result.major_result}
          onBack={() => setStep('career')}
          onRestart={reset}
        />
      )}
    </div>
  );
}
