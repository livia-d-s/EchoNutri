import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User,
  FileBadge,
  Loader2,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';
import { AppLogo } from './Icons';
import { sendPasswordResetEmail, AuthError } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { LegalOverlay, LegalTab } from './legal/LegalOverlay';
import { validateCrn } from '../utils/crnValidation';
import { validateEmail } from '../utils/emailValidation';
import { createInitialSubscription } from '../../types';

const EchoNutriLogo = () => (
  <div className="flex items-center gap-2.5 mb-1">
    <AppLogo className="w-10 h-10 shrink-0 shadow-xs rounded-md" />
    <div className="text-left">
      <div className="text-xl font-bold text-ink-primary tracking-tight leading-none">EchoNutri</div>
      <div className="text-2xs text-ink-tertiary font-medium uppercase tracking-[0.1em] mt-0.5">Inteligência clínica</div>
    </div>
  </div>
);

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
  </svg>
);

interface AuthScreenProps {
  initialMode?: 'login' | 'signup';
  onBackToLanding?: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ initialMode = 'login', onBackToLanding }) => {
  const { loginWithGoogle, loginWithEmail, registerWithEmail } = useAuth();
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [crm, setCrm] = useState('');
  const [legalConsent, setLegalConsent] = useState(false);
  const [legalOverlay, setLegalOverlay] = useState<LegalTab | null>(null);
  const [crmError, setCrmError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setIsForgotPassword(false);
    setResetSent(false);
    setError(null);
    setEmailError(null);
    setCrmError(null);
    setShowPassword(false);
  };

  const toggleForgotPassword = () => {
    setIsForgotPassword(!isForgotPassword);
    setResetSent(false);
    setError(null);
    setEmailError(null);
    setCrmError(null);
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    // On signup mode, require explicit consent before sending the user to Google.
    if (!isLogin && !legalConsent) {
      setError("Você precisa aceitar os Termos de Uso e a Política de Privacidade para continuar.");
      return;
    }
    setIsLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      setError("Não foi possível entrar com Google. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailError(null);
    setIsLoading(true);

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      setEmailError(emailCheck.error);
      setError(emailCheck.error);
      setIsLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, emailCheck.canonical);
      setResetSent(true);
    } catch (err: any) {
      const errorCode = (err as AuthError).code;
      let message = "Não foi possível enviar o e-mail.";
      if (errorCode === 'auth/user-not-found') message = "E-mail não encontrado.";
      else if (errorCode === 'auth/invalid-email') message = "E-mail inválido.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailError(null);
    setCrmError(null);
    setIsLoading(true);

    try {
      const emailCheck = validateEmail(email);
      if (!emailCheck.valid) {
        setEmailError(emailCheck.error);
        throw new Error(emailCheck.error);
      }

      if (isLogin) {
        await loginWithEmail(emailCheck.canonical, password);
      } else {
        if (!fullName.trim()) throw new Error("Informe seu nome completo.");
        const crnCheck = validateCrn(crm);
        if (!crnCheck.valid) {
          setCrmError(crnCheck.error);
          throw new Error(crnCheck.error);
        }
        if (!legalConsent) throw new Error("Você precisa aceitar os Termos de Uso e a Política de Privacidade para continuar.");

        const user = await registerWithEmail(emailCheck.canonical, password, fullName);
        await setDoc(doc(db, "doctors", user.uid), {
          uid: user.uid,
          fullName,
          email: emailCheck.canonical,
          crn: crnCheck.canonical, // formato padronizado "NNNNN/UF"
          crnNumber: crnCheck.number,
          crnUf: crnCheck.uf,
          specialty: 'Nutricionista',
          createdAt: new Date().toISOString(),
          role: 'nutritionist',
          // LGPD: persist consent timestamp + version for audit trail.
          legalConsent: {
            acceptedAt: new Date().toISOString(),
            termsVersion: '2026-05-12',
            privacyVersion: '2026-05-12',
          },
          // Trial de 7 dias começa agora. Stripe IDs ficam vazios — preenchidos
          // quando o checkout for integrado (Semana 4).
          subscription: createInitialSubscription(),
        });

        // Seed the app profile so the nutri's name shows up immediately. The
        // displayName set via updateProfile isn't reflected in the cached auth
        // user until a reload, so the profile load (appData/profile) wouldn't
        // pick it up otherwise.
        await setDoc(
          doc(db, "users", user.uid, "appData", "profile"),
          { name: fullName, specialty: 'Nutricionista' },
          { merge: true }
        );
      }
    } catch (err: any) {
      let message = "Algo deu errado. Tente novamente.";
      const errorCode = (err as AuthError).code;
      if (errorCode === 'auth/email-already-in-use') message = "Este e-mail já está em uso.";
      else if (errorCode === 'auth/invalid-email') message = "E-mail inválido.";
      else if (errorCode === 'auth/weak-password') message = "A senha precisa de pelo menos 6 caracteres.";
      // Firebase's email-enumeration protection returns the same code for a
      // wrong password and a non-existent account — on purpose, so we can't
      // reveal which. Keep the message generic and nudge toward signup.
      else if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') message = "E-mail ou senha incorretos. Confira os dados — ou crie uma conta se ainda não tem.";
      else if (err.message) message = err.message;
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const getHeaderContent = () => {
    if (isForgotPassword) {
      return { title: "Recuperar acesso", subtitle: "Enviaremos as instruções para seu e-mail" };
    }
    return {
      title: isLogin ? 'Bem-vindo de volta' : 'Crie sua conta',
      subtitle: isLogin ? 'Inteligência clínica para nutrição integrativa' : 'Nutricionistas com CRN ativo'
    };
  };

  const header = getHeaderContent();

  return (
    <div className="min-h-screen w-full bg-base flex items-center justify-center p-4">
      <div className="bg-surface w-full max-w-md rounded-lg border border-line shadow-sm overflow-hidden">
        <div className="p-7 pb-5 text-center border-b border-line relative">
          {isForgotPassword ? (
            <button
              onClick={toggleForgotPassword}
              className="absolute left-5 top-7 text-ink-tertiary hover:text-ink-primary transition-colors"
              title="Voltar"
            >
              <ArrowLeft size={18} />
            </button>
          ) : onBackToLanding && (
            <button
              onClick={onBackToLanding}
              className="absolute left-5 top-7 text-ink-tertiary hover:text-ink-primary transition-colors"
              title="Voltar"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="flex justify-center mb-4">
            <EchoNutriLogo />
          </div>
          <h2 className="text-md font-semibold text-ink-primary mt-3">{header.title}</h2>
          <p className="text-ink-secondary text-sm mt-1">{header.subtitle}</p>
        </div>

        <div className="p-7 pt-5">
          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-100 rounded-md flex items-center gap-2 text-critical text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {isForgotPassword && resetSent ? (
            <div className="text-center py-4">
              <div className="mx-auto w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-7 h-7 text-positive" />
              </div>
              <h3 className="text-md font-semibold text-ink-primary mb-2">Instruções enviadas</h3>
              <p className="text-ink-secondary text-sm mb-5">
                Verifique seu e-mail (incluindo pasta de spam) para resetar a senha.
              </p>
              <button
                type="button"
                onClick={toggleForgotPassword}
                className="w-full py-2.5 px-4 rounded-md bg-subtle text-ink-primary font-semibold hover:bg-line transition-colors text-sm"
              >
                Voltar
              </button>
            </div>
          ) : (
            <>
              {!isForgotPassword && (
                <>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-line rounded-md bg-surface text-ink-primary font-semibold hover:bg-subtle transition-colors disabled:opacity-60 disabled:cursor-not-allowed mb-5 text-sm"
                  >
                    <GoogleIcon />
                    Continuar com Google
                  </button>

                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px bg-line" />
                    <span className="text-2xs text-ink-tertiary uppercase tracking-[0.1em]">ou</span>
                    <div className="flex-1 h-px bg-line" />
                  </div>
                </>
              )}

              <form onSubmit={isForgotPassword ? handleResetPassword : handleSubmit} className="space-y-4">
                {!isLogin && !isForgotPassword && (
                  <>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-4 w-4 text-ink-tertiary group-focus-within:text-brand-700 transition-colors" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Nome completo"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-line rounded-md focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none transition-all placeholder:text-ink-tertiary text-ink-primary bg-surface text-sm"
                      />
                    </div>

                    <div>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FileBadge className={`h-4 w-4 transition-colors ${crmError ? 'text-critical' : 'text-ink-tertiary group-focus-within:text-brand-700'}`} />
                        </div>
                        <input
                          type="text"
                          required
                          placeholder="CRN (ex: 12345/SP)"
                          value={crm}
                          onChange={(e) => { setCrm(e.target.value); if (crmError) setCrmError(null); }}
                          onBlur={() => {
                            if (!crm.trim()) { setCrmError(null); return; }
                            const r = validateCrn(crm);
                            if (r.valid) {
                              setCrm(r.canonical);
                              setCrmError(null);
                            } else {
                              setCrmError(r.error);
                            }
                          }}
                          className={`block w-full pl-10 pr-3 py-2.5 border rounded-md focus:ring-2 outline-none transition-all placeholder:text-ink-tertiary text-ink-primary bg-surface text-sm ${
                            crmError ? 'border-critical focus:ring-critical/20 focus:border-critical' : 'border-line focus:ring-brand-700/20 focus:border-brand-700'
                          }`}
                        />
                      </div>
                      {crmError ? (
                        <p className="text-2xs text-critical mt-1 ml-1">{crmError}</p>
                      ) : (
                        <p className="text-2xs text-ink-tertiary mt-1 ml-1 leading-snug">
                          Validamos apenas o formato. Você é responsável por declarar um CRN ativo, conforme nossos Termos de Uso.
                        </p>
                      )}
                    </div>
                  </>
                )}

                <div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className={`h-4 w-4 transition-colors ${emailError ? 'text-critical' : 'text-ink-tertiary group-focus-within:text-brand-700'}`} />
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="E-mail profissional"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(null); }}
                      onBlur={() => {
                        if (!email.trim()) { setEmailError(null); return; }
                        const r = validateEmail(email);
                        if (r.valid) {
                          setEmail(r.canonical);
                          setEmailError(null);
                        } else {
                          setEmailError(r.error);
                        }
                      }}
                      className={`block w-full pl-10 pr-3 py-2.5 border rounded-md focus:ring-2 outline-none transition-all placeholder:text-ink-tertiary text-ink-primary bg-surface text-sm ${
                        emailError ? 'border-critical focus:ring-critical/20 focus:border-critical' : 'border-line focus:ring-brand-700/20 focus:border-brand-700'
                      }`}
                    />
                  </div>
                  {emailError && (
                    <p className="text-2xs text-critical mt-1 ml-1">{emailError}</p>
                  )}
                </div>

                {!isForgotPassword && (
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-ink-tertiary group-focus-within:text-brand-700 transition-colors" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-2.5 border border-line rounded-md focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none transition-all placeholder:text-ink-tertiary text-ink-primary bg-surface text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-tertiary hover:text-brand-700 transition-colors focus:outline-none"
                      title={showPassword ? "Ocultar senha" : "Ver senha"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                )}

                {isLogin && !isForgotPassword && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="text-sm text-brand-700 hover:text-brand-900 font-semibold transition-colors"
                      onClick={toggleForgotPassword}
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                )}

                {!isLogin && !isForgotPassword && (
                  <label className="flex items-start gap-2.5 text-sm text-ink-secondary leading-snug cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={legalConsent}
                      onChange={(e) => setLegalConsent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded cursor-pointer accent-brand-700 flex-shrink-0"
                    />
                    <span>
                      Li e aceito os{' '}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setLegalOverlay('terms'); }}
                        className="text-brand-700 hover:text-brand-900 font-semibold underline underline-offset-2"
                      >
                        Termos de Uso
                      </button>
                      {' '}e a{' '}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setLegalOverlay('privacy'); }}
                        className="text-brand-700 hover:text-brand-900 font-semibold underline underline-offset-2"
                      >
                        Política de Privacidade
                      </button>.
                    </span>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={isLoading || (!isLogin && !isForgotPassword && !legalConsent)}
                  className="w-full flex justify-center items-center py-2.5 px-4 rounded-md text-sm font-semibold text-white bg-brand-700 hover:bg-brand-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-700/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    isForgotPassword
                      ? 'Enviar instruções'
                      : (isLogin ? 'Acessar' : 'Criar conta')
                  )}
                </button>
              </form>
            </>
          )}

          {!isForgotPassword && (
            <div className="mt-6 text-center">
              <p className="text-sm text-ink-secondary">
                {isLogin ? 'Primeira vez aqui?' : 'Já tem uma conta?'}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="ml-2 font-semibold text-brand-700 hover:text-brand-900 transition-colors"
                >
                  {isLogin ? 'Cadastre-se' : 'Entre aqui'}
                </button>
              </p>
            </div>
          )}

          {isForgotPassword && !resetSent && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={toggleForgotPassword}
                className="text-sm font-semibold text-ink-secondary hover:text-ink-primary transition-colors flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft size={14} />
                Voltar
              </button>
            </div>
          )}
        </div>

        {/* Persistent legal footer — always reachable */}
        <div className="px-7 py-3 border-t border-line bg-subtle flex items-center justify-center gap-4 text-2xs text-ink-tertiary">
          <button
            type="button"
            onClick={() => setLegalOverlay('terms')}
            className="hover:text-ink-primary font-medium transition-colors"
          >
            Termos de Uso
          </button>
          <span className="text-ink-tertiary">·</span>
          <button
            type="button"
            onClick={() => setLegalOverlay('privacy')}
            className="hover:text-ink-primary font-medium transition-colors"
          >
            Política de Privacidade
          </button>
        </div>
      </div>

      {legalOverlay && (
        <LegalOverlay
          initialTab={legalOverlay}
          onClose={() => setLegalOverlay(null)}
        />
      )}
    </div>
  );
};

export default AuthScreen;
