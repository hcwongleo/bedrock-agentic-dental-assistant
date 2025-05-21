import { useState } from 'react';
import { 
    HelpPanel, 
    TextContent, 
    Box, 
    SpaceBetween,
    Modal,
    Button
} from "@cloudscape-design/components";
import topArchitecture from '../assets/auto_loan_app_top.png'; 
import architectureImage from '../assets/architecture.png';
import dentistAssistant from '../assets/loan_applicant_assistant.png';
import technicianAssistant from '../assets/broker_assistant.png';

interface ArchitectureModalProps {
    visible: boolean;
    onDismiss: () => void;
    image: string;
    title: string;
    description: string;
}

const ArchitectureModal = ({ visible, onDismiss, image, title, description }: ArchitectureModalProps) => (
    <Modal
        visible={visible}
        onDismiss={onDismiss}
        header={title}
        size="large"
    >
        <Box padding="l">
            <SpaceBetween size="l">
                <img 
                    src={image}
                    alt={title}
                    style={{
                        maxWidth: '100%',
                        height: 'auto'
                    }}
                />
                <Box variant="p" color="text-body-secondary">
                    {description}
                </Box>
            </SpaceBetween>
        </Box>
    </Modal>
);

export const InfoPanel = () => {
    const [selectedArchitecture, setSelectedArchitecture] = useState<{
        image: string;
        title: string;
        description: string;
    } | null>(null);

    const architectures = [
        {
            title: "System Architecture Overview",
            image: topArchitecture,
            description: "High-level overview of the Automated Dental Assistant system architecture, showcasing how Amazon Bedrock's capabilities are integrated to provide intelligent order processing and automated assistance."
        },
        {
            title: "Architecture Diagram",
            image: architectureImage,
            description: "Complete solution architecture showcasing the integration of AWS services including AppSync, Lambda, S3, and Amazon Bedrock for intelligent dental order processing and validation."
        },
        {
            title: "Dentist Assistant",
            image: dentistAssistant,
            description: "AI-powered assistant helping dentists navigate through the order process, providing real-time guidance for successful submission of dental orders."
        },
        {
            title: "Technician Assistant",
            image: technicianAssistant,
            description: "Intelligent technician assistant leveraging Amazon Bedrock for automated order analysis, validation, and verification, streamlining the dental order processing workflow."
        }
    ];

    const handleImageClick = (arch: typeof architectures[0]) => {
        console.log('Image clicked:', arch.title);
        setSelectedArchitecture(arch);
    };

    return (
        <>
            <HelpPanel
                footer={
                    <TextContent>
                        <h3>
                            Learn more
                        </h3>
                        <ul>
                            <li>
                                <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/bda.html">
                                    Amazon Bedrock Data Automation
                                </a>
                            </li>
                            <li>
                                <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/agents-multi-agent-collaboration.html">
                                    Amazon Bedrock multi-agent Collaboration
                                </a>
                            </li>
                        </ul>
                    </TextContent>
                }
                header={<h2>Solution Overview</h2>}
            >
                <TextContent>
                    <SpaceBetween size="l">
                        {architectures.map((arch, index) => (
                            <div key={index}>
                                <h3>{arch.title}</h3>
                                <Button
                                    variant="inline-link"
                                    onClick={() => handleImageClick(arch)}
                                >
                                    <img 
                                        src={arch.image}
                                        alt={arch.title}
                                        style={{
                                            maxWidth: '100%',
                                            height: 'auto',
                                            cursor: 'pointer'
                                        }}
                                    />
                                </Button>
                                <Box variant="p" color="text-body-secondary" padding={{ top: 's' }}>
                                    {arch.description}
                                </Box>
                            </div>
                        ))}
                    </SpaceBetween>
                </TextContent>
            </HelpPanel>

            {selectedArchitecture && (
                <ArchitectureModal 
                    visible={true}
                    onDismiss={() => setSelectedArchitecture(null)}
                    image={selectedArchitecture.image}
                    title={selectedArchitecture.title}
                    description={selectedArchitecture.description}
                />
            )}
        </>
    );
};
