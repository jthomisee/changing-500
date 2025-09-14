# Data source for existing Route53 hosted zone for changing500.com
data "aws_route53_zone" "changing500" {
  name = "changing500.com."
}

# Data source for existing Route53 hosted zone for dealinholden.com
data "aws_route53_zone" "dealinholden" {
  name = "dealinholden.com."
}

# Route53 records for ACM certificate validation
resource "aws_route53_record" "website_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.website_cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
      zone   = dvo.domain_name
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id = contains(["changing500.com", "www.changing500.com"], each.value.zone) ? data.aws_route53_zone.changing500.zone_id : data.aws_route53_zone.dealinholden.zone_id
}

# Route53 records for API ACM certificate validation  
resource "aws_route53_record" "api_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api_cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.changing500.zone_id
}

# Route53 A record for changing500.com pointing to CloudFront
resource "aws_route53_record" "website_a_record" {
  zone_id = data.aws_route53_zone.changing500.zone_id
  name    = "changing500.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.website_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.website_distribution.hosted_zone_id
    evaluate_target_health = false
  }
}

# Route53 AAAA record for changing500.com (IPv6) pointing to CloudFront
resource "aws_route53_record" "website_aaaa_record" {
  zone_id = data.aws_route53_zone.changing500.zone_id
  name    = "changing500.com"
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.website_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.website_distribution.hosted_zone_id
    evaluate_target_health = false
  }
}

# Route53 CNAME record for www.changing500.com pointing to changing500.com
resource "aws_route53_record" "website_www_cname" {
  zone_id = data.aws_route53_zone.changing500.zone_id
  name    = "www.changing500.com"
  type    = "CNAME"
  ttl     = 300
  records = ["changing500.com"]
}

# Route53 A record for API subdomain pointing to API Gateway
resource "aws_route53_record" "api_a_record" {
  zone_id = data.aws_route53_zone.changing500.zone_id
  name    = "api.changing500.com"
  type    = "A"

  alias {
    name                   = aws_api_gateway_domain_name.api_domain.regional_domain_name
    zone_id                = aws_api_gateway_domain_name.api_domain.regional_zone_id
    evaluate_target_health = false
  }
}

# Route53 AAAA record for API subdomain (IPv6)
resource "aws_route53_record" "api_aaaa_record" {
  zone_id = data.aws_route53_zone.changing500.zone_id
  name    = "api.changing500.com"
  type    = "AAAA"

  alias {
    name                   = aws_api_gateway_domain_name.api_domain.regional_domain_name
    zone_id                = aws_api_gateway_domain_name.api_domain.regional_zone_id
    evaluate_target_health = false
  }
}

# Route53 A record for old dealinholden.com domain
resource "aws_route53_record" "old_website_a_record" {
  zone_id = data.aws_route53_zone.dealinholden.zone_id
  name    = "dealinholden.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.website_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.website_distribution.hosted_zone_id
    evaluate_target_health = false
  }
}

# Route53 AAAA record for old dealinholden.com domain (IPv6)
resource "aws_route53_record" "old_website_aaaa_record" {
  zone_id = data.aws_route53_zone.dealinholden.zone_id
  name    = "dealinholden.com"
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.website_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.website_distribution.hosted_zone_id
    evaluate_target_health = false
  }
}

# Route53 CNAME record for www.dealinholden.com pointing to dealinholden.com
resource "aws_route53_record" "old_website_www_cname" {
  zone_id = data.aws_route53_zone.dealinholden.zone_id
  name    = "www.dealinholden.com"
  type    = "CNAME"
  ttl     = 300
  records = ["dealinholden.com"]
}
