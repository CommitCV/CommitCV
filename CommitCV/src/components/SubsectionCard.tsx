import { useForm, Controller } from 'react-hook-form';
              import { BulletCollection, ParagraphCollection } from "@/resume/ResumeComponents";
              import { ResumeData } from "@/app/resume/page";
              import TextComponent from "./TextComponent";

              interface ISubsectionCardProps {
                sectionName: string;
                title: string;
                link?: string;
                date: string;
                subtitle?: string;
                location?: string;
                condensed?: boolean;
                bulletCollection?: BulletCollection;
                paragraphCollection?: ParagraphCollection;
                setJData: React.Dispatch<React.SetStateAction<ResumeData | null>>;
              }

              export default function SubsectionCard({
                sectionName,
                title,
                link,
                date,
                subtitle = "",
                location = "",
                condensed,
                bulletCollection,
                paragraphCollection,
                setJData,
              }: ISubsectionCardProps) {
                const { control, handleSubmit } = useForm({
                  defaultValues: { title, link, date, subtitle, location, condensed }
                });

                const onSubmit = (data: Record<string, unknown>) => {
                  setJData(prevData => {
                    if (!prevData) return prevData;
                    const updatedSections = prevData.Sections.map(section => {
                      if (section.name === sectionName) {
                        const updatedSubsections = section.subsections?.map(sub =>
                          sub.title === title ? { ...sub, ...data } : sub
                        );
                        return { ...section, subsections: updatedSubsections };
                      }
                      return section;
                    });
                    return { ...prevData, Sections: updatedSections };
                  });
                };

                const handleBulletChange = (index: number, bold: string, normal: string) => {
                  setJData(prevData => {
                    if (!prevData) return prevData;
                    const updatedSections = prevData.Sections.map(section => {
                      if (section.name === sectionName) {
                        const updatedSubsections = section.subsections?.map(sub => {
                          if (sub.title === title && sub.bulletCollection) {
                            const updatedBullets = [...sub.bulletCollection.bullets];
                            updatedBullets[index] = { bold, normal };
                            return { ...sub, bulletCollection: { ...sub.bulletCollection, bullets: updatedBullets } };
                          }
                          return sub;
                        });
                        return { ...section, subsections: updatedSubsections };
                      }
                      return section;
                    });
                    return { ...prevData, Sections: updatedSections };
                  });
                };

                const handleParagraphChange = (index: number, bold: string, normal: string) => {
                  setJData(prevData => {
                    if (!prevData) return prevData;
                    const updatedSections = prevData.Sections.map(section => {
                      if (section.name === sectionName) {
                        const updatedSubsections = section.subsections?.map(sub => {
                          if (sub.title === title && sub.paragraphCollection) {
                            const updatedParagraphs = [...sub.paragraphCollection.paragraphs];
                            updatedParagraphs[index] = { bold, normal };
                            return { ...sub, paragraphCollection: { ...sub.paragraphCollection, paragraphs: updatedParagraphs } };
                          }
                          return sub;
                        });
                        return { ...section, subsections: updatedSubsections };
                      }
                      return section;
                    });
                    return { ...prevData, Sections: updatedSections };
                  });
                };

                return (
                  <div className="bg-gray-100 shadow-lg rounded-lg p-8">
                    <form onBlur={handleSubmit(onSubmit)} className="flex flex-col gap-2">
                      <Controller
                        name="title"
                        control={control}
                        render={({ field }) => (
                          <input {...field} placeholder="Title" className="block min-w-0 p-2 text-base rounded-xl" />
                        )}
                      />
                      <Controller
                        name="link"
                        control={control}
                        render={({ field }) => (
                          <input {...field} placeholder="Link" className="block min-w-0 p-2 text-base rounded-xl" />
                        )}
                      />
                      <Controller
                        name="date"
                        control={control}
                        render={({ field }) => (
                          <input {...field} placeholder="Date" className="block min-w-0 p-2 text-base rounded-xl" />
                        )}
                      />
                      <Controller
                        name="subtitle"
                        control={control}
                        render={({ field }) => (
                          <input {...field} placeholder="Subtitle" className="block min-w-0 p-2 text-base rounded-xl" />
                        )}
                      />
                      <Controller
                        name="location"
                        control={control}
                        render={({ field }) => (
                          <input {...field} placeholder="Location" className="block min-w-0 p-2 text-base rounded-xl" />
                        )}
                      />
                      {/*<Controller*/}
                      {/*  name="condensed"*/}
                      {/*  control={control}*/}
                      {/*  render={({ field }) => (*/}
                      {/*    <label>*/}
                      {/*      <input type="checkbox" checked={field.value as boolean} {...field} />*/}
                      {/*      Condensed*/}
                      {/*    </label>*/}
                      {/*  )}*/}
                      {/*/>*/}
                      {bulletCollection?.bullets?.map((bullet, index) => (
                        <TextComponent
                          key={index}
                          bold={bullet.bold ?? ""}
                          normal={bullet.normal ?? ""}
                          onBoldChange={(newBold: string) => handleBulletChange(index, newBold, bullet.normal ?? "")}
                          onNormalChange={(newNormal: string) => handleBulletChange(index, bullet.bold ?? "", newNormal)}
                        />
                      ))}
                      {paragraphCollection?.paragraphs?.map((paragraph, index) => (
                        <TextComponent
                          key={index}
                          bold={paragraph.bold ?? ""}
                          normal={paragraph.normal ?? ""}
                          onBoldChange={(newBold: string) => handleParagraphChange(index, newBold, paragraph.normal ?? "")}
                          onNormalChange={(newNormal: string) => handleParagraphChange(index, paragraph.bold ?? "", newNormal)}
                        />
                      ))}
                    </form>
                  </div>
                );
              }