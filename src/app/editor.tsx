import Header from "@components/header";
import EditorToolbar from "@components/editor/editor-toolbar";
import ViewportToolbar from "@components/editor/viewport-toolbar";
import HeaderCard from "@components/editor/header-card";
import SectionCard from "@components/editor/section-card";

const sections = [
    { title: "Section", header: "Education", enabled: true },
    { title: "Section", header: "Work Experience", enabled: true },
    { title: "Section", header: "Volunteer Experience", enabled: true },
    { title: "Section", header: "Projects", enabled: true },
    { title: "Section", header: "Hackathon Projects", enabled: false },
    { title: "Section", header: "Awards", enabled: true },
];

export default function Editor() {
    return (
        <div className="h-screen flex flex-col bg-light-100 dark:bg-dark-300 text-light-950 dark:text-dark-950">
            <Header />

            <div className="flex-1 flex gap-6 p-6 overflow-hidden">
                <div className="w-1/2 flex flex-col gap-3 overflow-y-auto">
                    <EditorToolbar />

                    <div className="flex flex-col gap-3 pb-4">
                        <HeaderCard />

                        {sections.map((section, i) => (
                            <SectionCard
                                key={i}
                                title={section.title}
                                headerValue={section.header}
                                enabled={section.enabled}
                            />
                        ))}
                    </div>
                </div>

                <div className="w-1/2 flex flex-col gap-3 overflow-hidden">
                    <ViewportToolbar />

                    <div className="flex-1 bg-white dark:bg-dark-100 border-2 border-border-light dark:border-border-dark rounded-lg overflow-y-auto flex items-center justify-center">
                        <p className="text-light-700 dark:text-dark-700 text-lg">
                            Resume preview will render here
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
