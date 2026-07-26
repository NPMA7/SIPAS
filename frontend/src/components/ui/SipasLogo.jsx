import logoImg from '../../assets/logo.png';

export default function SipasLogo({ size = 36, className = '', style = {} }) {
  return (
    <img
      src={logoImg}
      alt="SIPAS Logo"
      width={size}
      height={size}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.25),
        objectFit: 'cover',
        flexShrink: 0,
        display: 'block',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        ...style,
      }}
    />
  );
}
