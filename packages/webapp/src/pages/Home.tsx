import { Box, ContentLayout, Grid, RadioGroup, Container } from "@cloudscape-design/components";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppRoutes } from "./PageNavigation";
import HomeTop from "../assets/home_top_section.png";
import ApplicantRole from "../assets/home_applicant.png";
import BrokerRole from "../assets/home_broker.png";

export const Home = () => {
    const navigate = useNavigate();
    const [selectedValue, setSelectedValue] = useState<string>("");
    
    const handleRoleSelection = (value: string) => {
        if (value === "applicant") {
            navigate(AppRoutes.chat.href);
        } else if (value === "broker") {
            navigate(AppRoutes.review.href);
        }
    };

    return (
        <ContentLayout
            defaultPadding
            disableOverlap
            headerBackgroundStyle={mode =>
                `center center/cover url(${HomeTop})`
            }
            header={
                <Box padding={{ vertical: "xxxl" }} margin={{left: "l"}}>
                    <Grid
                        gridDefinition={[
                            { colspan: { default: 12, s: 8 } }
                        ]}
                    >
                        <Container>
                            <Box padding="s">
                                <Box
                                    fontSize="display-l"
                                    fontWeight="bold"
                                    variant="h1"
                                    padding="n"
                                >
                                    Automated Dental Assistant
                                </Box>
                                <Box
                                    fontSize="heading-xl"
                                    variant="p"
                                    color="text-body-secondary"
                                >
                                    Your AI-powered Dental Order Processing System
                                </Box>
                            </Box>
                        </Container>
                    </Grid>
                </Box>
            }
        >
        <Box padding={{ vertical: "xxl", horizontal: "l" }}>
            <Box
                fontSize="heading-xl"
                fontWeight="bold"
                variant="h2"
                padding={{ bottom: "xl" }}
            >
                Please select your role
            </Box>
                <Grid
                    gridDefinition={[
                        { colspan: 6 },
                        { colspan: 6 }
                    ]}
                >
                    <Box padding={{ horizontal: "s" }}>
                        <div style={{
                            border: '2px solid #d1d5db',
                            borderRadius: '8px',
                            padding: '16px',
                        }}>
                            <RadioGroup
                                value={selectedValue}
                                onChange={({ detail }) => handleRoleSelection(detail.value)}
                                items={[
                                    {
                                        value: "applicant",
                                        label: "Dentist",
                                        description: (
                                            <div style={{
                                                marginTop: '8px',
                                                borderRadius: '4px',
                                                overflow: 'hidden'
                                            }}>
                                                <img 
                                                    src={ApplicantRole} 
                                                    alt="Dentist Role"
                                                    style={{
                                                        width: "100%",
                                                        display: "block"
                                                    }}
                                                />
                                                />
                                            </div>
                                        )
                                    }
                                ]}
                            />
                        </div>
                    </Box>
                    <Box padding={{ horizontal: "s" }}>
                        <div style={{
                            border: '2px solid #d1d5db',
                            borderRadius: '8px',
                            padding: '16px',
                        }}>
                            <RadioGroup
                                value={selectedValue}
                                onChange={({ detail }) => handleRoleSelection(detail.value)}
                                items={[
                                    {
                                        value: "broker",
                                        label: "Technician",
                                        description: (
                                            <div style={{
                                                marginTop: '8px',
                                                borderRadius: '4px',
                                                overflow: 'hidden'
                                            }}>
                                                <img 
                                                    src={BrokerRole} 
                                                    alt="Technician Role"
                                                    style={{
                                                        width: "100%",
                                                        display: "block"
                                                    }}
                                                />
                                            </div>
                                        )
                                    }
                                ]}
                            />
                        </div>
                    </Box>
                </Grid>
            </Box>
        </ContentLayout>
    );
};
