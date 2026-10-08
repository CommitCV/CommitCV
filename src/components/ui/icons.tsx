import {
    faAlignJustify,
    faArrowLeft,
    faArrowRight,
    faBold,
    faChevronDown,
    faDownload,
    faFileExport,
    faFloppyDisk,
    faItalic,
    faLink,
    faLinkSlash,
    faMagnifyingGlass,
    faBars,
    faListUl,
    faPlus,
    faRotateLeft,
    faRotateRight,
    faTable,
    faTableColumns,
    faTrash,
    faUnderline,
    faUpload,
    type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import {
    FontAwesomeIcon,
    type FontAwesomeIconProps,
} from "@fortawesome/react-fontawesome";

type IconProps = Omit<FontAwesomeIconProps, "icon">;

const icon = (definition: IconDefinition) =>
    function Icon(props: IconProps) {
        return (
            <FontAwesomeIcon
                icon={definition}
                {...props}
            />
        );
    };

export const AlignJustify = icon(faAlignJustify);
export const ArrowLeft = icon(faArrowLeft);
export const ArrowRight = icon(faArrowRight);
export const Bold = icon(faBold);
export const Bullet = icon(faListUl);
export const ChevronDown = icon(faChevronDown);
export const Download = icon(faDownload);
export const FileExport = icon(faFileExport);
export const Github = icon(faGithub);
export const Italic = icon(faItalic);
export const Link = icon(faLink);
export const Bars = icon(faBars);
export const LinkSlash = icon(faLinkSlash);
export const MagnifyingGlass = icon(faMagnifyingGlass);
export const Plus = icon(faPlus);
export const Redo = icon(faRotateRight);
export const Save = icon(faFloppyDisk);
export const Table = icon(faTable);
export const TableColumns = icon(faTableColumns);
export const Trash = icon(faTrash);
export const Underline = icon(faUnderline);
export const Undo = icon(faRotateLeft);
export const Upload = icon(faUpload);
