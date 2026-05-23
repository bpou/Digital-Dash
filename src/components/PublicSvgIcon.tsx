type PublicSvgIconProps = {
  src: string;
  className?: string;
};

export default function PublicSvgIcon({ src, className = "" }: PublicSvgIconProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block bg-current ${className}`}
      style={{
        WebkitMask: `url(${src}) center / contain no-repeat`,
        mask: `url(${src}) center / contain no-repeat`,
      }}
    />
  );
}
