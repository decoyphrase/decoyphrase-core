import { SVGProps } from "react";

interface FileDocumentLogoProps extends SVGProps<SVGSVGElement> {
  onClick?: () => void;
}

const FileDocumentLogo = ({
  onClick,
  className,
  ...props
}: FileDocumentLogoProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 256 256"
    fill="currentColor"
    onClick={onClick}
    className={`text-black dark:text-white ${className || ""}`}
    style={{ cursor: onClick ? "pointer" : "default" }}
    {...props}
  >
    <path d="M73.9 36c-1.4 1.4-1.5 1.7-1.5 9.6v8.1h-60l-1.2 1.6-1.2 1.5v162.8l1.3.9c1.2.8 11.8 1 101.2 1 97.9 0 99.9 0 101.7-1.2 1.4-.8 2.2-1.9 2.8-4 .4-1.6 7.3-28.4 15.1-59.6 9.9-39.5 14.2-57.3 13.8-58.3-.2-1-1-1.9-1.9-2.2-.8-.4-7.4-.6-14.7-.6h-13.1V85.5c0-13.6.5-12.9-10.7-13.1l-8.5-.2V66l-15.8-15.7-15.7-15.8H75.3L73.9 36zm84.8 21c0 17.3-1.4 15.9 15.9 15.9h12.9v22.8H81.9V44.1h76.8V57zm15.9.3 6 6h-12.3v-6c0-3.3.1-6 .2-6 0 0 2.8 2.7 6.1 6zM72.4 79.4v16.2H58.5c-15.5 0-17.1.4-18.7 3.8-.5 1.1-5.1 18.8-10.3 39.4-5.2 20.6-9.5 37.7-9.7 38.1-.1.3-.2-25.1-.2-56.5l-.1-57.1h52.9v16.1zm134.3 9.3v6.9h-9.6V81.8h9.6v6.9zm15.2 69.7c-7.4 29.3-13.4 53.3-13.4 53.4 0 .1-42.2.2-93.8.2H20.9L34 159.8c7.2-28.7 13.3-52.7 13.5-53.4l.4-1.3h187.5l-13.5 53.3z" />
    <path d="M91.5 58.5v4.8h48v-9.6h-48v4.8zM91.5 77.6v4.8h57.6v-9.6H91.5v4.8z" />
  </svg>
);

export default FileDocumentLogo;
