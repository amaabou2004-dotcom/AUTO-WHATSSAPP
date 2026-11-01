import { Check, Copy, ExternalLink, Info, KeyRound, MessageCircleMore, ShieldCheck, Webhook } from 'lucide-react';
import type { IntegrationSettings } from '../../shared/types';
import { useToast } from '../components/Toast';
import { ErrorState, PageHeader, PageLoader } from '../components/UI';
import { useApi } from '../hooks/useApi';
import { getPublicApiUrl } from '../lib/api';

export default function Settings() {
  const { data: settings, loading, error, refresh } = useApi<IntegrationSettings>('/settings');
  const { showToast } = useToast();

  if (loading && !settings) return <PageLoader />;
  if (error && !settings) return <ErrorState message={error} retry={refresh} />;
  if (!settings) return null;

  const webhookUrl = getPublicApiUrl(settings.webhookPath.replace(/^\/api/, ''));

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label} copié dans le presse-papiers.`);
    } catch {
      showToast('La copie automatique n’est pas disponible. Sélectionnez le texte manuellement.', 'error');
    }
  }

  return (
    <div className="settings-page">
      <PageHeader eyebrow="CONFIGURATION" title="Paramètres" description="Connectez votre compte WhatsApp Business et gardez le contrôle de vos envois." />

      <section className={`integration-hero ${settings.configured ? 'connected' : ''}`}>
        <span className="integration-logo"><MessageCircleMore size={29} /></span>
        <div><span className="integration-kicker">INTÉGRATION WHATSAPP</span><h2>{settings.configured ? 'Votre compte WhatsApp est connecté' : 'Passez du mode démo aux vraies conversations'}</h2><p>{settings.configured ? 'Les messages sont transmis via la WhatsApp Cloud API.' : 'Configurez la WhatsApp Cloud API pour activer les envois réels et recevoir les messages du chatbot.'}</p></div>
        <span className={`integration-status ${settings.configured ? 'live' : ''}`}><i />{settings.configured ? 'Connecté' : 'Mode démo'}</span>
      </section>

      <div className="settings-grid">
        <section className="card setup-card">
          <div className="card-header"><div><h2>Guide de connexion</h2><p>Trois étapes pour relier votre compte professionnel</p></div><KeyRound size={20} className="muted-icon" /></div>
          <div className="setup-steps">
            <div className="setup-step"><span>1</span><div><h3>Créez une application Meta</h3><p>Dans Meta for Developers, créez une application professionnelle et ajoutez le produit <strong>WhatsApp</strong>.</p><a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" rel="noreferrer">Ouvrir le guide Meta <ExternalLink size={14} /></a></div></div>
            <div className="setup-step"><span>2</span><div><h3>Renseignez les identifiants serveur</h3><p>Copiez <code>.env.example</code> vers <code>.env</code>, puis complétez les valeurs ci-dessous. Redémarrez ensuite l’application.</p><div className="code-block"><code>WHATSAPP_ACCESS_TOKEN=votre_token{`\n`}WHATSAPP_PHONE_NUMBER_ID=votre_id{`\n`}WHATSAPP_VERIFY_TOKEN=votre_token_secret</code><button onClick={() => copy('WHATSAPP_ACCESS_TOKEN=\nWHATSAPP_PHONE_NUMBER_ID=\nWHATSAPP_VERIFY_TOKEN=', 'Le modèle de configuration')} aria-label="Copier le modèle"><Copy size={16} /></button></div></div></div>
            <div className="setup-step"><span>3</span><div><h3>Activez le webhook</h3><p>Dans la configuration WhatsApp de Meta, utilisez cette URL de rappel et le même token que <code>WHATSAPP_VERIFY_TOKEN</code>. Abonnez-vous au champ <strong>messages</strong>.</p><div className="webhook-field"><Webhook size={17} /><code>{webhookUrl}</code><button className="icon-button" onClick={() => copy(webhookUrl, 'L’URL du webhook')} aria-label="Copier l’URL du webhook"><Copy size={16} /></button></div></div></div>
          </div>
        </section>

        <aside className="settings-side">
          <section className="card configuration-card">
            <div className="card-header"><div><h2>Configuration actuelle</h2><p>Informations non sensibles</p></div></div>
            <dl className="config-list">
              <div><dt>Canal</dt><dd>{settings.configured ? 'WhatsApp Cloud API' : 'Simulateur local'}</dd></div>
              <div><dt>Version de l’API</dt><dd><code>{settings.apiVersion}</code></dd></div>
              <div><dt>Phone Number ID</dt><dd>{settings.phoneNumberId ? <code>{settings.phoneNumberId}</code> : <span>Non renseigné</span>}</dd></div>
              <div><dt>Business Account ID</dt><dd>{settings.businessAccountId ? <code>{settings.businessAccountId}</code> : <span>Non renseigné</span>}</dd></div>
            </dl>
            <div className="config-ready"><Check size={16} /><span>{settings.configured ? 'La configuration essentielle est présente.' : 'L’application est prête à être testée en démo.'}</span></div>
          </section>

          <section className="security-card">
            <ShieldCheck size={24} />
            <h3>Vos identifiants restent privés</h3>
            <p>Le token d’accès n’est jamais transmis au navigateur ni enregistré dans la base de données locale. Ne partagez votre fichier <code>.env</code> avec personne.</p>
          </section>

          <section className="info-card">
            <Info size={20} />
            <div><h3>Bon à savoir</h3><p>Pour initier une conversation avec la Cloud API, Meta peut exiger un modèle de message approuvé. Les réponses dans la fenêtre de service de 24 h utilisent les messages texte de cette application.</p></div>
          </section>
        </aside>
      </div>
    </div>
  );
}
