import { SVGProps } from "react";

interface LogoProps extends SVGProps<SVGSVGElement> {
  onClick?: () => void;
}

const Logo = ({ onClick, ...props }: LogoProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 320 320"
    fill="none"
    onClick={onClick}
    style={{ cursor: onClick ? "pointer" : "default" }}
    {...props}
  >
    <path
      fill="#999"
      d="m138.909 71.478-4.165-4.164V22.042l4.165-4.165h43.574l4.165 4.165v45.272l-4.165 4.164h-43.574ZM23.686 302v-36.094h37.79c21.286 0 63.858-15.517 63.858-77.586s-42.572-75.941-63.858-75.118h-37.79V76.029h37.79c63.303 0 91.623 47.713 97.869 71.57l62.239-71.57h73.73v37.173h-50.362l-54.449 61.236v29.075l54.295 61.159h50.516v37.174h-73.73l-62.161-71.031c-16.782 56.269-72.29 70.902-97.947 71.185h-37.79Z"
    />
  </svg>
);

export default Logo;
