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
        borderRadius: Math.round(size * 0.22),
        objectFit: 'contain',
        objectPosition: 'center',
        flexShrink: 0,
        display: 'block',
        ...style,
      }}
    />
  );
}
