import Button from "@components/ui/button";
import Card from "@components/ui/card";

export default function ResumeSelector() {
    return (
        <Card
            variant="surface"
            className="w-full max-w-3xl mx-auto p-8">
            <p className="text-center text-light-950 dark:text-dark-950 text-lg font-medium mb-8">
                Start a new resume or upload an existing resume or
                <br />
                sign in with GitHub to access your library of resumes
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Card
                    variant="elevated"
                    className="flex flex-col items-center justify-center gap-6 p-10 rounded-xl">
                    <p className="text-2xl font-semibold tracking-tight text-light-950 dark:text-dark-950 text-center">
                        Start a new resume!
                    </p>
                    <Button variant="primary">Click here</Button>
                </Card>

                <Card
                    variant="outlined"
                    className="flex items-center justify-center p-10 rounded-xl cursor-pointer hover:opacity-80 transition-opacity">
                    <p className="text-2xl font-semibold tracking-tight text-light-700 dark:text-dark-700 text-center">
                        Drag or click to upload a .json file here
                    </p>
                </Card>
            </div>
        </Card>
    );
}
