import { Link, useLocation } from 'react-router-dom';
import { Printer } from 'lucide-react';
import ParticleCanvas from './ParticleCanvas';
import '../../styles/AuthStyles.css';

const AuthLayout = ({
  children,
  headline,
  description,
  features,
  note,
  leftGraphic,
  leftTagline = 'SAINTGITS COLLEGE OF ENGINEERING',
  wrapperClassName = '',
  containerClassName = '',
  rightPanelClassName = '',
  previewLabel = '',
}) => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="auth-body">
      <ParticleCanvas />



      <div className={`auth-wrapper ${wrapperClassName}`.trim()}>
        <div className={`auth-container ${containerClassName}`.trim()}>
          <div className="left-panel">
            <div className="left-brand">
              <Link to="/" className="flex items-center gap-3 group" style={{ textDecoration: 'none' }}>
                <p className="text-3xl font-black tracking-tighter text-white m-0">Reposys</p>
              </Link>
              <div className="left-tagline">{leftTagline}</div>
            </div>

            {leftGraphic && <div className="left-graphic">{leftGraphic}</div>}

            <div className="left-content">

              <h2 className="left-headline" dangerouslySetInnerHTML={{ __html: headline }} />
              <p className="left-desc">{description}</p>

              {features ? (
                <div className="left-features">
                  {features.map((feature) => (
                    <div key={feature.text} className="feature-item">
                      <div className="feature-icon">{feature.icon}</div>
                      <span className="feature-text">{feature.text}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {note ? (
              <div className="left-note-shell">
                <div className={`left-note-card ${note.tone === 'gold' ? 'note-gold' : ''}`.trim()}>
                  {note.label ? <p className="left-note-label">{note.label}</p> : null}
                  <p className="left-note-copy">{note.content}</p>
                </div>
              </div>
            ) : null}


          </div>

          <div className={`right-panel ${rightPanelClassName}`.trim()}>{children}</div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
