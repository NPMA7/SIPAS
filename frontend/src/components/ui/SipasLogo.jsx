import logoImg from '../../assets/logo.png';

export default function SipasLogo({ size = 34, className = '', style = {} }) {
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
        objectFit: 'contain',
        flexShrink: 0,
        display: 'block',
        mixBlendMode: 'screen',
        ...style,
      }}
    />
  );
}
