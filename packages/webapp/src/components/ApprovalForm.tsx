import React, { useState, useEffect } from 'react';
import { 
    SplitPanel,
    Form,
    SpaceBetween,
    Button,
    FormField,
    Input,
    Box,
    Checkbox,
    Modal,
    Icon,
    Header
} from "@cloudscape-design/components";
import { useMutation } from "@tanstack/react-query";
import { appsyncResolver } from "../hooks/useApi";
import { HtmlPreview } from './HtmlPreview';


interface ApprovalFormProps {
    initialData: FormData | null;
    onPreview?: (formData: FormData) => void;
    onCancel: () => void;
}

interface GenerateLetterResponse {
    success: boolean;
    result: string;
    statusCode: string;
}

interface FormData {
    date: string;
    dentistName: string;
    dentalPractice: string;
    patientId: string;
    toothPosition: string;
    productType: string;
    materialCategory: string;
    material: string;
    shade: string;
    ponticDesign: string;
    specialInstructions: string;
    estimatedDeliveryDate: string;
}

export const ApprovalForm: React.FC<ApprovalFormProps> = ({ 
    initialData,
    onCancel 
}) => {
    const [formData, setFormData] = useState<FormData>(initialData || {
        date: new Date().toISOString().split('T')[0],
        dentistName: '',
        dentalPractice: '',
        patientId: '',
        toothPosition: '',
        productType: '',
        materialCategory: '',
        material: '',
        shade: '',
        ponticDesign: '',
        specialInstructions: '',
        estimatedDeliveryDate: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]
    });

    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [generatedHtml, setGeneratedHtml] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [isSending, setIsSending] = useState(false);
    
    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    const handleSend = async () => {
        setIsSending(true);
        // Simulate sending email - replace with actual API call if needed
        await new Promise(resolve => setTimeout(resolve, 1000));
        setShowSuccessMessage(true);
        setIsSending(false);
    };

    const generateLetterMutation = useMutation<GenerateLetterResponse, Error, FormData>({
        mutationFn: async (data: FormData) => {
            const payload = {
                opr: "generate_approval_letter",
                ...data
            };
            const response = await appsyncResolver(JSON.stringify(payload));

            console.log('Raw response from resolver:', response);
            const resultStr = response.data?.resolverLambda;
            if (resultStr) {
                const htmlMatch = resultStr.match(/(<(?:!DOCTYPE html|div class).*?)(?:, statusCode=|$)/s);

                if (htmlMatch && htmlMatch[1]) {
                    return {
                        success: true,
                        result: htmlMatch[1],
                        statusCode: "200"
                    };
                }
            }
            throw new Error("Failed to generate letter");
        },
        onSuccess: (response) => {
            console.log('Setting HTML content:', response.result);
            setGeneratedHtml(response.result);
            setIsGenerating(false);
        },
        onError: (error) => {
            console.error("Error details:", error);
            const errorMessage = error.message || "Failed to generate letter";
            setIsGenerating(false);
        }
    });

    const handlePreviewClick = () => {
        console.log('Preview button clicked');
        setShowPreviewModal(true);
        setIsGenerating(true);
        // Then trigger the generation
        generateLetterMutation.mutate(formData);
    };

    const handleInputChange = (field: keyof FormData, value: string | boolean) => {
        setFormData((prev: FormData) => ({ ...prev, [field]: value }));
    };

    return (
    <>
        <SplitPanel 
            header={"Order Confirmation Letter"}
        >
            <Box padding="s">
                <Form
                    actions={
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button 
                                variant="link" 
                                onClick={onCancel}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handlePreviewClick}
                                iconAlign="left"
                            >
                                <Box variant="awsui-gen-ai-label">
                                    <Icon size="small" name="gen-ai" />
                                    <span>Preview AI-generated letter</span>
                                </Box>
                            </Button>
                        </SpaceBetween>
                    }
                >
                <SpaceBetween direction="vertical" size="l">
                    <Form>
                        <SpaceBetween direction="vertical" size="l">
                            <FormField label="Date">
                                <Input 
                                    value={formData.date}
                                    onChange={e => handleInputChange('date', e.detail.value)}
                                />
                            </FormField>
                            <FormField label="Dentist Name">
                                <Input 
                                    value={formData.dentistName}
                                    onChange={e => handleInputChange('dentistName', e.detail.value)}
                                />
                            </FormField>
                            <FormField label="Dental Practice">
                                <Input 
                                    value={formData.dentalPractice}
                                    onChange={e => handleInputChange('dentalPractice', e.detail.value)}
                                />
                            </FormField>
                            <FormField label="Patient ID">
                                <Input 
                                    value={formData.patientId}
                                    onChange={e => handleInputChange('patientId', e.detail.value)}
                                />
                            </FormField>
                            <FormField label="Tooth Position">
                                <Input 
                                    value={formData.toothPosition}
                                    onChange={e => handleInputChange('toothPosition', e.detail.value)}
                                />
                            </FormField>

                            <FormField label="Product Type">
                                <Input 
                                    value={formData.productType}
                                    onChange={e => handleInputChange('productType', e.detail.value)}
                                />
                            </FormField>
                            <FormField label="Material Category">
                                <Input 
                                    value={formData.materialCategory}
                                    onChange={e => handleInputChange('materialCategory', e.detail.value)}
                                />
                            </FormField>
                            <FormField label="Material">
                                <Input 
                                    value={formData.material}
                                    onChange={e => handleInputChange('material', e.detail.value)}
                                />
                            </FormField>
                            <FormField label="Shade">
                                <Input 
                                    value={formData.shade}
                                    onChange={e => handleInputChange('shade', e.detail.value)}
                                />
                            </FormField>
                            <FormField label="Pontic Design">
                                <Input 
                                    value={formData.ponticDesign}
                                    onChange={e => handleInputChange('ponticDesign', e.detail.value)}
                                />
                            </FormField>
                            <FormField label="Special Instructions">
                                <Input 
                                    value={formData.specialInstructions}
                                    onChange={e => handleInputChange('specialInstructions', e.detail.value)}
                                />
                            </FormField>
                            <FormField label="Estimated Delivery Date">
                                <Input 
                                    value={formData.estimatedDeliveryDate}
                                    onChange={e => handleInputChange('estimatedDeliveryDate', e.detail.value)}
                                    type="date"
                                />
                            </FormField>
                        </SpaceBetween>
                    </Form>
                </SpaceBetween>  
              </Form>
            </Box>
        </SplitPanel>

        <Modal
            visible={showPreviewModal}
            onDismiss={() => {
                setShowPreviewModal(false);
                setGeneratedHtml('');
                setIsGenerating(false);
                setShowSuccessMessage(false);  
            }}
            header={
                <Header
                  variant="h2"
                  actions={
                    <Button
                        iconName="send"
                        variant="primary"
                        onClick={handleSend}
                        loading={isSending}
                        disabled={isGenerating || !generatedHtml || isSending}
                    >
                        Send
                    </Button>
                }
            >
                Preview Order Confirmation
            </Header>
            }
            size="large"
        >

        <Box padding="l">
            {showSuccessMessage && (
                <Box
                    variant="awsui-key-label"
                    color="text-status-success"
                    textAlign="center"
                    margin={{ bottom: 'm' }}
                    padding="s"
                >
                    <SpaceBetween size="xs" direction="horizontal" alignItems="center">
                        <Icon
                            name="status-positive"
                            size="small"
                            variant="success"
                        />
                        Successfully sent to dental practice email: dental@example.com
                    </SpaceBetween>
                </Box>
            )}
        </Box>
            <Box padding="l">
                <HtmlPreview 
                    html={generatedHtml}
                    isLoading={isGenerating}
                />
            </Box>
        </Modal>

    </>
    );
};
