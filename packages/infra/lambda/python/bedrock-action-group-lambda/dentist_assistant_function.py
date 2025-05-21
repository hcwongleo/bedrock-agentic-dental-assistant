import os
import json
import boto3
from datetime import datetime, timedelta
from botocore.exceptions import ClientError 

AWS_REGION = os.environ['AWS_REGION']
PREFIX = "bda-result"
ORDER_PREFIX = "orders"
ACCOUNT_ID = os.environ.get('ACCOUNT_ID', '')
S3_BUCKET = f"data-bucket-{ACCOUNT_ID}-{AWS_REGION}"

def get_named_parameter(event, name):
    if 'parameters' in event:
        if event['parameters']:
            for item in event['parameters']:
                if item['name'] == name:
                    return item['value']
        return None
    else:
        return None
    
def populate_function_response(event, response_body):
    return {'response': {'actionGroup': event['actionGroup'], 'function': event['function'],
                'functionResponse': {'responseBody': {'TEXT': {'body': str(response_body)}}}}}

def record_order_details(order_id, order_data):
    """
    Creates or updates order with order details
    """
    try:
        s3_client = boto3.client('s3')
        s3_key = f"{ORDER_PREFIX}/{order_id}.json"
        
        # Try to get existing order data
        existing_data = {}
        try:
            response = s3_client.get_object(
                Bucket=S3_BUCKET,
                Key=s3_key
            )
            existing_data = json.loads(response['Body'].read().decode('utf-8'))
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                # If the file doesn't exist, create a new order
                existing_data = {
                    "order_id": order_id,
                    "timestamp": datetime.now().isoformat()
                }
            else:
                # Re-raise if it's a different error
                raise
        
        # Parse the custom format: {order_details={key=value, key=value}}
        parsed_order_data = {}
        if isinstance(order_data, str):
            try:
                # Check if it's the custom format with equals signs
                if "order_details={" in order_data:
                    # Extract the content inside the inner braces
                    inner_content = order_data.split("order_details={")[1].split("}")[0]
                    
                    # Split by commas and then by equals sign
                    pairs = inner_content.split(", ")
                    for pair in pairs:
                        if "=" in pair:
                            key, value = pair.split("=", 1)
                            parsed_order_data[key.strip()] = value.strip()
                else:
                    # Try standard JSON parsing as fallback
                    parsed_order_data = json.loads(order_data)
                    if 'order_details' in parsed_order_data:
                        parsed_order_data = parsed_order_data['order_details']
            except Exception as e:
                # Create empty data as fallback
                parsed_order_data = {}
        else:
            # If it's already an object, use it directly
            parsed_order_data = order_data
            
        # Update with new dental order details
        existing_data.update({
            'tooth_position': parsed_order_data.get('tooth_position', ''),
            'product': parsed_order_data.get('product', ''),
            'material_category': parsed_order_data.get('material_category', ''),
            'material': parsed_order_data.get('material', ''),
            'pontic_design': parsed_order_data.get('pontic_design', ''),
            'shade': parsed_order_data.get('shade', '')
        })
        
        # Store updated data
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=json.dumps(existing_data)
        )
        
        return {
            "status": "success",
            "message": "Order details updated successfully",
            "order_id": order_id,
            "data": existing_data
        }
        
    except Exception as e:
        error_message = f"Error updating order details: {str(e)}"
        return {
            "status": "error",
            "message": error_message
        }

def lambda_handler(event, context):
    function = event['function']

    if function == 'record_order_details':
        order_id = get_named_parameter(event, 'order_id')
        order_data = get_named_parameter(event, 'order_data')
            
        if not order_id or not order_data:
            return populate_function_response(event, "Missing order_id or order_data")
            
        result = record_order_details(order_id, order_data)
    
    else:
        error_message = f"Unrecognized function: {function}"
        raise Exception(error_message)

    response = populate_function_response(event, result)
    return response
