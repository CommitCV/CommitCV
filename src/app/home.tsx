import Header from "@components/header";
import Footer from "@components/footer";
import ResumeSelector from "@components/resume-selector";
import FeatureSection from "@components/feature-section";

export default function Home() {
    return (
        <div className="min-h-screen flex flex-col bg-light-100 dark:bg-dark-300 text-light-950 dark:text-dark-950">
            <Header />

            <main className="flex-1">
                <section className="flex flex-col items-center gap-6 px-8 pt-16 pb-12">
                    <h1 className="text-5xl md:text-6xl font-bold tracking-tight italic text-center">
                        Your resume your way
                    </h1>
                    <p className="text-lg text-light-700 dark:text-dark-700 text-center max-w-lg">
                        Make your resume with ease using our visual editor and
                        export it locally on your device.
                    </p>
                </section>

                <section className="px-8 pb-16">
                    <ResumeSelector />
                </section>

                <FeatureSection title="Privacy is our biggest priority">
                    <p>
                        Your resume contains all your private employment
                        information
                    </p>
                    <p className="font-semibold text-light-950 dark:text-dark-950">
                        Your private information should stay private.
                    </p>
                </FeatureSection>

                <FeatureSection title="Version control your resume with Git">
                    <p>
                        Keep track of your changes to your resume by tracking
                        the history of your resume using Git&apos;s version
                        control.
                    </p>
                    <p>
                        Sign into GitHub and clone our template repository to
                        get started.
                    </p>
                </FeatureSection>
            </main>

            <Footer />
        </div>
    );
}
