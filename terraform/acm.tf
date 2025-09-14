# ACM Certificate for CloudFront (must be in us-east-1)
resource "aws_acm_certificate" "website_cert" {
  domain_name = "changing500.com"
  subject_alternative_names = [
    "www.changing500.com",
    "dealinholden.com", 
    "www.dealinholden.com"
  ]
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = local.common_tags
}

# Separate ACM Certificate for API Gateway (REGIONAL)
resource "aws_acm_certificate" "api_cert" {
  domain_name       = "api.changing500.com"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = local.common_tags
}

# ACM Certificate validation for website cert
resource "aws_acm_certificate_validation" "website_cert" {
  certificate_arn         = aws_acm_certificate.website_cert.arn
  validation_record_fqdns = [for record in aws_route53_record.website_cert_validation : record.fqdn]
  
  timeouts {
    create = "5m"
  }
}

# ACM Certificate validation for API cert  
resource "aws_acm_certificate_validation" "api_cert" {
  certificate_arn         = aws_acm_certificate.api_cert.arn
  validation_record_fqdns = [for record in aws_route53_record.api_cert_validation : record.fqdn]
  
  timeouts {
    create = "5m"
  }
}
