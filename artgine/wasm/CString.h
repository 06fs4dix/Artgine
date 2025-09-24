
#include "Type.h"
#include "STL.h"

#ifndef CString_H
#define CString_H
class CString
{
	//string m_temp;
public:
	string m_str;
    int m_con = -1;

    void Clear()
    {
        m_str.clear();
    }
    CString() {}
	CString(char pa_val)
    {
        Clear();
        m_str.resize(1);
        m_str[0] = pa_val;
    }
	CString(const char* pa_val, int _conType = -1)
    {
        Clear();
        m_str = pa_val;
    }
	CString(const string& pa_val, int _conType = -1)
    {
        Clear();
        m_str = pa_val;
    }
	CString(Int32 _val)
    {
        char temp[128] = { 0, };
        sprintf(temp, "%d", _val);
        m_str = CString(temp);
    }
    int length()	const { return (int)m_str.size(); }
	bool isEmpty()	const { return m_str.empty(); }
    char & operator [] (size_t _offset)
    {
        return m_str[_offset];
    }
	const char & operator [] (size_t _offset)	const
    {
        return m_str[_offset];
    }
    operator string()	const { return m_str; }
    
    CString(float _val, bool _cut=false)
    {
        char temp[128] = { 0, };
        if (_val == 0 || _val == (int)_val)
            sprintf(temp, "%d", (int)_val);
        else if (_cut)
            sprintf(temp, "%.3f", _val);
        else
            sprintf(temp, "%f", _val);
        m_str = CString(temp);
    }
    CString(const CString& pa_val)
    {
        m_str = pa_val;
    }

    CString operator + (const CString& obj)	const
    {
        CString temp(m_str);
        temp += obj;
        return temp;
    }
	CString& operator += (const CString& obj)
    {
        m_str += obj;
        return *this;
    }
    bool operator == (const CString& obj)	const
    {
        return m_str == obj.m_str;
    }
	bool equals(CString _str)	const
    {
        return m_str == _str.m_str;
    }
    
    const char* c_str()	const { return m_str.c_str(); }
    
};

#endif //CString_H

