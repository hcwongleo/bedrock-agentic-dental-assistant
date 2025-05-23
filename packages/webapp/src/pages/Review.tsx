import { 
    Button, 
    Header, 
    Container, 
    StatusIndicator, 
    BreadcrumbGroup,
    PropertyFilter,
    PropertyFilterProps,
    Table,
    Box,
    SpaceBetween,
    ColumnLayout,
    Link
  } from "@cloudscape-design/components";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchJsonFromPath, useS3ListItems } from '../hooks/useStorage';
import { QUERY_KEYS } from "../utils/types";
import { useQueryClient } from '@tanstack/react-query';
import { remove } from 'aws-amplify/storage';
  
interface DentalOrderData {
    orderId: string;
    dentistName: string;
    toothPosition: string;
    product: string;
    material: string;
    status: string;
    notes: string;
    timestamp: string;
}

interface FilterToken extends PropertyFilterProps.Token {
    propertyKey: keyof DentalOrderData;
    operator: ":" | "=" | "!=" | ">" | "<";
    value: string;
}

interface FilterQuery extends PropertyFilterProps.Query {
    tokens: readonly FilterToken[]; 
    operation: 'and' | 'or';
}

const filterOrders = (
    orders: DentalOrderData[], 
    query: PropertyFilterProps.Query
) => {
    if (!query.tokens.length) return orders;

    return orders.filter(order => {
        const results = query.tokens.map(token => {
            if (!token.propertyKey) return true;
            
            const value = String(order[token.propertyKey as keyof DentalOrderData]);
            
            switch (token.operator) {
                case ":":
                    return value.toLowerCase().includes(token.value.toLowerCase());
                case "=":
                    return value.toLowerCase() === token.value.toLowerCase();
                case "!=":
                    return value.toLowerCase() !== token.value.toLowerCase();
                case ">":
                    return Number(value) > Number(token.value);
                case "<":
                    return Number(value) < Number(token.value);
                default:
                    return true;
            }
        });

        return query.operation === 'and' 
            ? results.every(r => r) 
            : results.some(r => r);
    });
};

export const Review = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { data: orderItems, isLoading, refetch } = useS3ListItems(QUERY_KEYS.ORDERS);
    const [orders, setOrders] = useState<DentalOrderData[]>([]);
    const [query, setQuery] = useState<PropertyFilterProps.Query>({
        tokens: [],
        operation: "and"
      });
    const filteredOrders = filterOrders(orders, query);
    const [isDeleted, setIsDeleted] = useState(false);

    const getOrderCounts = (orders: DentalOrderData[]) => {
        return {
            new: orders.filter(order => order.status === "New order").length,
            underReview: orders.filter(order => order.status === "Under review").length,
            awaitingApproval: orders.filter(order => order.status.startsWith("Awaiting")).length
        };
    };

    useEffect(() => {
        queryClient.invalidateQueries({ 
            queryKey: [QUERY_KEYS.ORDERS] 
        });
        refetch();
    }, [refetch]); 

    useEffect(() => {
        console.log('Order Items:', orderItems);
        if (!orderItems) {
            setOrders([]);
            return;
        }

        const fetchOrders = async () => {
            try {
                const ordersData = await Promise.all(
                    orderItems.map(async (item) => {
                        const fullPath = `${item.path}${item.itemName}`;
                        const jsonData = await fetchJsonFromPath(fullPath);
                        if (!jsonData || typeof jsonData === 'string') {
                            console.error('Invalid JSON data received');
                            return null;
                        }
                        console.log('Processing order data in Review.tsx:', jsonData);
                        return {
                            orderId: jsonData.order_id || jsonData.application_id,
                            dentistName: jsonData.dentist_name || 'Unknown Dentist',
                            toothPosition: jsonData.tooth_position || jsonData.order_details?.tooth_position || '-',
                            product: jsonData.product || jsonData.order_details?.product || '-',
                            material: jsonData.material_category && jsonData.material ? 
                                `${jsonData.material_category} ${jsonData.material}`.trim() : 
                                `${jsonData.order_details?.material_category || ''} ${jsonData.order_details?.material || ''}`.trim() || '-',
                            status: jsonData.status || 
                            (item === orderItems[0] ? "New order" : "Under review"),
                            notes: jsonData.notes || 
                            (item === orderItems[0] ? "New submission, needs review" : "-"),
                            timestamp: jsonData.timestamp
                        };
                    })
                );
                
                // Filter out any null values and sort by timestamp
                const validOrders = ordersData
                    .filter(order => order !== null)
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((order, index) => ({
                        ...order,
                        status: index === 0 ? "New order" : order.status,
                        notes: index === 0 ? "New submission, needs review" : (order.notes || "-")
                    }));

                console.log('Processed and sorted orders:', validOrders);
                setOrders(validOrders);
            } catch (error) {
                console.error('Error loading orders:', error);
            }
        };

        fetchOrders();
    }, [orderItems]);
  
    return(
        <SpaceBetween size="l">
            <BreadcrumbGroup
              items={[
              { text: "Dental Order System", href: "/" },
              {
                  text: "Dental Order List",
                  href: "#"
              }
              ]}
              ariaLabel="Breadcrumbs"
            />

            <Container
                header={<Header variant="h2">Order Overview</Header>}
            >
                <ColumnLayout columns={3} variant="text-grid">
                    <div>
                        <Box variant="awsui-key-label">New Orders</Box>
                        <Box variant="awsui-value-large">{getOrderCounts(orders).new}</Box>
                    </div>
                    <div>
                        <Box variant="awsui-key-label">Under Review</Box>
                        <Box variant="awsui-value-large">{getOrderCounts(orders).underReview}</Box>
                    </div>
                    <div>
                        <Box variant="awsui-key-label">Awaiting Approval</Box>
                        <Box variant="awsui-value-large">{getOrderCounts(orders).awaitingApproval}</Box>
                    </div>
                </ColumnLayout>
            </Container>
  

            <PropertyFilter
                query={query}
                onChange={({ detail }) => setQuery(detail)}
                filteringPlaceholder="Find order by dentist name, tooth position, or product"
                filteringProperties={[
                    {
                        key: "orderId",
                        operators: [":", "=", "!="],
                        propertyLabel: "Order ID",
                        groupValuesLabel: "Order ID values"
                    },
                    {
                        key: "dentistName",
                        operators: [":", "=", "!="],
                        propertyLabel: "Dentist name",
                        groupValuesLabel: "Dentist names"
                    },
                    {
                        key: "toothPosition",
                        operators: [":", "=", "!="],
                        propertyLabel: "Tooth Position",
                        groupValuesLabel: "Tooth positions"
                    },
                    {
                        key: "product",
                        operators: ["=", "!="],
                        propertyLabel: "Product",
                        groupValuesLabel: "Product types"
                    },
                    {
                        key: "status",
                        operators: ["=", "!="],
                        propertyLabel: "Status",
                        groupValuesLabel: "Status values"
                    }
                ]}
                filteringOptions={[
                    // Add some common values for filtering
                    { propertyKey: "status", value: "New order" },
                    { propertyKey: "status", value: "Under review" },
                    { propertyKey: "status", value: "Awaiting approval" },
                    { propertyKey: "product", value: "Crown" },
                    { propertyKey: "product", value: "Bridge" },
                    { propertyKey: "product", value: "Veneer" }
                ]}
            />
    
            <Table
                loading={isLoading}
                loadingText="Loading dental orders"
                items={filteredOrders}
                columnDefinitions={[
                {
                    id: "orderId",
                    header: "Order ID",
                    cell: item => {
                        const isLatest = item === orders[0];
                        if (isLatest) {
                            return (
                                <Link
                                    onClick={() => navigate(`/portal/${item.orderId}`)}
                                >
                                    {item.orderId}
                                </Link>
                            );
                        }
                        return item.orderId;
                    },
                    sortingField: "orderId"
                },
                {
                    id: "dentistName",
                    header: "Dentist Name",
                    cell: item => item.dentistName,
                    sortingField: "dentistName"
                },
                {
                    id: "toothPosition",
                    header: "Tooth Position",
                    cell: item => item.toothPosition,
                    sortingField: "toothPosition"
                },
                {
                    id: "product",
                    header: "Product",
                    cell: item => item.product,
                    sortingField: "product"
                },
                {
                    id: "material",
                    header: "Material",
                    cell: item => item.material
                },
                {
                    id: "status",
                    header: "Order Status",
                    cell: item => {
                        const getStatusType = (status: string, isLatest: boolean) => {
                            if (isLatest) return "info";
                            if (status.startsWith("Awaiting")) return "warning"; 
                            return "in-progress"; 
                        };
                
                        // Check if this is the latest order by timestamp
                        const isLatest = item === orders[0];
                
                        return (
                            <StatusIndicator 
                                type={getStatusType(item.status, isLatest)}
                            >
                                {isLatest ? "New order" : item.status}
                            </StatusIndicator>
                        )
                    }
                },
                {
                    id: "notes",
                    header: "Notes/Comments",
                    cell: item => item.notes
                }]}
                empty={
                    <Box textAlign="center" color="inherit">
                        <b>No dental orders found</b>
                    </Box>
                }
                header={
                    <Header
                        variant="h2"
                        actions={             
                            <Button 
                                iconName={isDeleted ? "status-positive" : "remove"}
                                onClick={async () => {
                                   if (orderItems) {
                                       // Get the items in reverse order to get the latest one
                                       const items = [...orderItems].reverse();
                                       console.log("Reversed items:", items);
                                       
                                       if (items.length > 0) {
                                           const latestItem = items[0];
                                           console.log("Item to delete:", latestItem);
                                           const fullPath = `${latestItem.path}${latestItem.itemName}`;
               
                                           try {
                                               await remove({ path: fullPath });
                                               console.log("File deleted successfully");
                                               
                                               queryClient.invalidateQueries({ 
                                                   queryKey: [QUERY_KEYS.ORDERS] 
                                               });
                                               refetch();
                                               setIsDeleted(true);
                                               setTimeout(() => setIsDeleted(false), 2000);
                                           } catch (error) {
                                               console.error('Delete operation failed:', error);
                                           }
                                       }
                                   }
                                }
                            }
                             loading={isLoading}
                            >
                                {isDeleted ? "Deleted" : "Clear"}
                            </Button>
                        }
                    >Dental Orders</Header>
                }
            />
        </SpaceBetween>
    );
}
